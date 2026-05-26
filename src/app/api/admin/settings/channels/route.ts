import { NextRequest } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/client";
import { withRole } from "@/lib/api/auth-guard";
import { success, error, badRequest } from "@/lib/api/response";

type PipelineKind = "deal" | "release";

type ChannelPayload = {
  channel?: string;
  category?: string | null;
  note?: string | null;
  pipeline_kind?: PipelineKind;
};

function normalizePayload(raw: Record<string, unknown>): ChannelPayload {
  const payload: ChannelPayload = {};

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

export async function GET() {
  return withRole("admin", async () => {
    try {
      const { data, error: dbError } = await supabaseAdmin
        .from("read_channels")
        .select("*")
        .order("created_at", { ascending: false });

      if (dbError) throw dbError;
      return success(data ?? []);
    } catch (err) {
      console.error("Channels get error:", err);
      return error("Failed to fetch channels", "DB_ERROR");
    }
  });
}

export async function POST(request: NextRequest) {
  return withRole("admin", async () => {
    try {
      const raw = (await request.json()) as Record<string, unknown>;
      const payload = normalizePayload(raw);

      if (!payload.channel) {
        return badRequest("channel is required");
      }

      const { data, error: dbError } = await supabaseAdmin
        .from("read_channels")
        .insert({
          channel: payload.channel,
          category: payload.category ?? null,
          note: payload.note ?? null,
          pipeline_kind: payload.pipeline_kind ?? "deal",
        })
        .select("*")
        .single();

      if (dbError) throw dbError;
      return success(data, "Channel created");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to create channel";
      if (msg.startsWith("INVALID_")) return badRequest(msg);
      console.error("Channels create error:", err);
      return error("Failed to create channel", "DB_ERROR");
    }
  });
}
