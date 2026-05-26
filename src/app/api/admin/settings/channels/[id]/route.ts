import { NextRequest } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/client";
import { withRole } from "@/lib/api/auth-guard";
import { success, error, badRequest, notFound } from "@/lib/api/response";

type PipelineKind = "deal" | "release";

type ChannelUpdatePayload = {
  channel?: string;
  category?: string | null;
  note?: string | null;
  pipeline_kind?: PipelineKind;
};

function normalizePayload(raw: Record<string, unknown>): ChannelUpdatePayload {
  const payload: ChannelUpdatePayload = {};

  if ("channel" in raw) {
    const value = raw.channel;
    if (typeof value !== "string" || value.trim() === "") {
      throw new Error("INVALID_CHANNEL");
    }
    payload.channel = value.trim();
  }

  if ("category" in raw) {
    const value = raw.category;
    if (value === null || value === "") {
      payload.category = null;
    } else if (typeof value === "string") {
      payload.category = value.trim();
    } else {
      throw new Error("INVALID_CATEGORY");
    }
  }

  if ("note" in raw) {
    const value = raw.note;
    if (value === null || value === "") {
      payload.note = null;
    } else if (typeof value === "string") {
      payload.note = value.trim();
    } else {
      throw new Error("INVALID_NOTE");
    }
  }

  if ("pipeline_kind" in raw) {
    const value = raw.pipeline_kind;
    if (value !== "deal" && value !== "release") {
      throw new Error("INVALID_PIPELINE_KIND");
    }
    payload.pipeline_kind = value;
  }

  return payload;
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withRole("admin", async () => {
    try {
      const { id } = await params;
      const raw = (await request.json()) as Record<string, unknown>;
      const updates = normalizePayload(raw);

      if (Object.keys(updates).length === 0) {
        return badRequest("No valid fields provided");
      }

      const { data, error: dbError } = await supabaseAdmin
        .from("read_channels")
        .update(updates)
        .eq("id", id)
        .select("*")
        .single();

      if (dbError) {
        if ((dbError as { code?: string }).code === "PGRST116") return notFound("Channel");
        throw dbError;
      }

      return success(data, "Channel updated");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to update channel";
      if (msg.startsWith("INVALID_")) return badRequest(msg);
      console.error("Channels update error:", err);
      return error("Failed to update channel", "DB_ERROR");
    }
  });
}
