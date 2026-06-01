import { NextRequest } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/client";
import { withRole } from "@/lib/api/auth-guard";
import { success, error, notFound, badRequest } from "@/lib/api/response";
import { normalizePromptModel } from "@/lib/prompts/model-utils";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ kind: string }> }
) {
  return withRole("admin", async () => {
    try {
      const { kind } = await params;
      const body = await request.json();
      const { name, model, body: promptBody, notes } = body;

      if (!name && !model && !promptBody && !notes) {
        return badRequest("No fields to update");
      }

      const updates: Record<string, unknown> = {};
      if (name !== undefined) updates.name = name;
      if (model !== undefined) {
        const normalizedModel = normalizePromptModel(model);
        if (!normalizedModel) {
          return badRequest("INVALID_MODEL");
        }
        updates.model = normalizedModel;
      }
      if (promptBody !== undefined) updates.body = promptBody;
      if (notes !== undefined) updates.notes = notes;

      const { data, error: dbError } = await supabaseAdmin
        .from("prompts")
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq("id", kind)
        .select()
        .single();

      if (dbError) throw dbError;
      if (!data) return notFound("Prompt");

      return success(data, "Prompt updated");
    } catch (err) {
      console.error("Prompt update error:", err);
      return error("Failed to update prompt", "DB_ERROR");
    }
  });
}
