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
import { uploadBytesToR2 } from "@/lib/api/r2-upload";

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
      const generatedImageUrl = await pollImageTransformTask(config, taskId, (e) =>
        pushDebug(e.phase, e.payload)
      );
      pushDebug("task.completed", { taskId, generatedImageUrl });
      const newKey = appendSecReSuffix(
        image.r2_original_key || image.r2_thumbnail_key
      );
      pushDebug("image.key_generated", { newKey });

      const downloadRes = await fetch(generatedImageUrl);
      if (!downloadRes.ok) {
        pushDebug("r2.download_error", {
          status: downloadRes.status,
          generatedImageUrl,
        });
        throw new Error(`R2_SOURCE_DOWNLOAD_FAILED_${downloadRes.status}`);
      }
      const contentType =
        downloadRes.headers.get("content-type") || "image/png";
      const buffer = await downloadRes.arrayBuffer();
      const bytes = new Uint8Array(buffer);
      pushDebug("r2.download_ok", {
        contentType,
        byteLength: bytes.byteLength,
      });

      const r2PublicUrl = await uploadBytesToR2({
        key: newKey,
        bytes,
        contentType,
      });
      pushDebug("r2.upload_ok", {
        key: newKey,
        publicUrl: r2PublicUrl,
      });

      const { data: updated, error: updateError } = await supabaseAdmin
        .from("images")
        .update({
          r2_original_url: r2PublicUrl,
          r2_thumbnail_url: r2PublicUrl,
          r2_original_key: newKey,
          r2_thumbnail_key: newKey,
          image_provider: "apimart",
        })
        .eq("id", id)
        .select("id, r2_original_url, r2_original_key")
        .single();

      if (updateError) {
        pushDebug("db.update_error", {
          message: updateError.message,
          code: updateError.code,
          details: updateError.details,
          hint: updateError.hint,
        });
        throw updateError;
      }
      pushDebug("db.updated", {
        imageId: updated?.id ?? id,
        updatedUrl: updated?.r2_original_url ?? r2PublicUrl,
        updatedKey: updated?.r2_original_key ?? newKey,
      });

      return success({
        imageId: id,
        status: "completed",
        taskId,
        newUrl: updated?.r2_original_url ?? r2PublicUrl,
        newKey: updated?.r2_original_key ?? newKey,
        debug: debugEvents,
      });
    } catch (err) {
      console.error("Image regenerate error:", err instanceof Error ? err.message : err);

      const message =
        err instanceof Error
          ? err.message
          : typeof err === "object" && err !== null && "message" in err
          ? String((err as { message?: unknown }).message || "Image regenerate failed")
          : "Image regenerate failed";
      pushDebug("request.error", { message });
      if (typeof err === "object" && err !== null) {
        const maybe = err as {
          code?: unknown;
          details?: unknown;
          hint?: unknown;
        };
        pushDebug("request.error.raw", {
          code: maybe.code,
          details: maybe.details,
          hint: maybe.hint,
        });
      }

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
        message.startsWith("TASK_") ||
        message.startsWith("R2_")
      ) {
        return error(message, "UPSTREAM_ERROR", { debug: debugEvents }, 502);
      }

      return error(message || "Failed to regenerate image", "DB_ERROR", {
        debug: debugEvents,
      });
    }
  });
}
