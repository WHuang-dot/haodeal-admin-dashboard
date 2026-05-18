import { NextRequest } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/client";
import { withRole } from "@/lib/api/auth-guard";
import { success, error } from "@/lib/api/response";
import {
  appendSecReSuffix,
  getImageTransformConfig,
  ImageTransformDebugEvent,
  pollImageTransformTask,
  submitImageTransformTask,
} from "@/lib/api/image-transform";

type ImageRow = {
  id: string;
  r2_original_url: string | null;
  source_url: string | null;
  r2_original_key: string | null;
  r2_thumbnail_key: string | null;
};

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withRole("operator", async () => {
    const debugEvents: ImageTransformDebugEvent[] = [];
    const pushDebug = (phase: string, payload: Record<string, unknown>) => {
      debugEvents.push({
        phase,
        payload,
      });
    };

    try {
      const { id } = await params;
      pushDebug("request.start", { imageId: id });

      const { data: image, error: imageError } = await supabaseAdmin
        .from("images")
        .select(
          "id, r2_original_url, source_url, r2_original_key, r2_thumbnail_key"
        )
        .eq("id", id)
        .single<ImageRow>();

      if (imageError || !image) {
        return error(
          "Image not found",
          "NOT_FOUND",
          { debug: debugEvents },
          404
        );
      }

      const sourceImageUrl = (image.r2_original_url || image.source_url || "").trim();
      if (!sourceImageUrl) {
        return error(
          "Source image URL is missing",
          "BAD_REQUEST",
          { debug: debugEvents },
          400
        );
      }
      pushDebug("image.loaded", {
        imageId: image.id,
        hasOriginalUrl: Boolean(image.r2_original_url),
        hasSourceUrl: Boolean(image.source_url),
      });

      const config = await getImageTransformConfig();
      pushDebug("config.loaded", {
        submitUrl: config.submitUrl,
        taskUrlBase: config.taskUrlBase,
        model: config.model,
        pollIntervalMs: config.pollIntervalMs,
        pollTimeoutMs: config.pollTimeoutMs,
        maxAttempts: config.maxAttempts,
        promptLength: config.prompt.length,
      });
      const taskId = await submitImageTransformTask(config, sourceImageUrl, (e) =>
        pushDebug(e.phase, e.payload)
      );
      pushDebug("task.created", { taskId });
      const newImageUrl = await pollImageTransformTask(config, taskId, (e) =>
        pushDebug(e.phase, e.payload)
      );
      pushDebug("task.completed", { taskId, newImageUrl });
      const newKey = appendSecReSuffix(
        image.r2_original_key || image.r2_thumbnail_key
      );
      pushDebug("image.key_generated", { newKey });

      const { data: updated, error: updateError } = await supabaseAdmin
        .from("images")
        .update({
          r2_original_url: newImageUrl,
          r2_thumbnail_url: newImageUrl,
          r2_original_key: newKey,
          r2_thumbnail_key: newKey,
          image_provider: "apimart",
          updated_at: new Date().toISOString(),
        })
        .eq("id", id)
        .select("id, r2_original_url, r2_original_key")
        .single();

      if (updateError) {
        throw updateError;
      }
      pushDebug("db.updated", {
        imageId: updated?.id ?? id,
        updatedUrl: updated?.r2_original_url ?? newImageUrl,
        updatedKey: updated?.r2_original_key ?? newKey,
      });

      return success({
        imageId: id,
        status: "completed",
        taskId,
        newUrl: updated?.r2_original_url ?? newImageUrl,
        newKey: updated?.r2_original_key ?? newKey,
        debug: debugEvents,
      });
    } catch (err) {
      console.error("Image regenerate error:", err instanceof Error ? err.message : err);

      const message = err instanceof Error ? err.message : "Image regenerate failed";
      pushDebug("request.error", { message });

      if (
        message === "APP_RUNTIME_SETTINGS_NOT_FOUND" ||
        message === "IMAGE_TRANSFORM_DISABLED" ||
        message.startsWith("MISSING_IMAGE_TRANSFORM_") ||
        message.startsWith("INVALID_")
      ) {
        return error(message, "CONFIG_ERROR", { debug: debugEvents }, 400);
      }

      if (
        message.startsWith("SUBMIT_") ||
        message.startsWith("TASK_")
      ) {
        return error(message, "UPSTREAM_ERROR", { debug: debugEvents }, 502);
      }

      return error("Failed to regenerate image", "DB_ERROR", {
        debug: debugEvents,
      });
    }
  });
}
