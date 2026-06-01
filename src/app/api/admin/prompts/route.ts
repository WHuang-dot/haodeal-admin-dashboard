import { NextRequest } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/client";
import { withRole } from "@/lib/api/auth-guard";
import { success, error, badRequest } from "@/lib/api/response";
import { normalizePromptModel } from "@/lib/prompts/model-utils";

export async function GET(request: NextRequest) {
  return withRole("admin", async () => {
    try {
      const { searchParams } = new URL(request.url);
      const kind = searchParams.get("kind") ?? undefined;
      const limit = parseInt(searchParams.get("limit") ?? "50", 10);
      const offset = parseInt(searchParams.get("offset") ?? "0", 10);

      let query = supabaseAdmin
        .from("prompts")
        .select("*", { count: "exact" });

      if (kind) query = query.eq("kind", kind);

      query = query.order("created_at", { ascending: false });
      query = query.range(offset, offset + limit - 1);

      const { data, error: dbError, count } = await query;

      if (dbError) throw dbError;

      // Map DB field is_active to active for API
      const mappedData = (data ?? []).map((p: Record<string, unknown>) => ({
        id: p.id,
        kind: p.kind,
        name: p.name,
        model: p.model,
        active: p.is_active ?? false,
        created_at: p.created_at,
        body: p.body,
        notes: p.notes,
      }));

      const modelOptions = Array.from(
        new Set(
          mappedData
            .map((p) => normalizePromptModel(p.model))
            .filter((v): v is string => Boolean(v))
        )
      ).sort((a, b) => a.localeCompare(b));

      return success({
        data: mappedData,
        model_options: modelOptions,
        total: count ?? 0,
        limit,
        offset,
      });
    } catch (err) {
      console.error("Prompts list error:", err);
      return error("Failed to fetch prompts", "DB_ERROR");
    }
  });
}

export async function POST(request: NextRequest) {
  return withRole("admin", async () => {
    try {
      const body = await request.json();
      const { kind, name, body: promptBody, model, notes } = body;

      if (!kind || !name || !promptBody) {
        return badRequest("kind, name, and body are required");
      }

      if (!notes) {
        return badRequest("notes is required when creating a prompt");
      }

      const normalizedModel = normalizePromptModel(model);
      if (!normalizedModel) {
        return badRequest("INVALID_MODEL");
      }

      const { data, error: dbError } = await supabaseAdmin
        .from("prompts")
        .insert({
          kind,
          name,
          body: promptBody,
          model: normalizedModel,
          notes,
          is_active: false,
        })
        .select()
        .single();

      if (dbError) throw dbError;
      return success(data, "Prompt version created");
    } catch (err) {
      console.error("Prompt create error:", err);
      return error("Failed to create prompt", "DB_ERROR");
    }
  });
}
