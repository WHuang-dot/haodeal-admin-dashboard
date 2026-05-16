import { NextRequest } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/client";
import { withRole } from "@/lib/api/auth-guard";
import { success, error, badRequest } from "@/lib/api/response";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withRole("operator", async () => {
    try {
      const { id } = await params;
      const body = await request.json();
      const { store_code, category_code } = body;

      if (!store_code && !category_code) {
        return badRequest("Must provide store_code or category_code");
      }

      const updates: Record<string, unknown> = {};
      if (store_code !== undefined) {
        updates.store_code = store_code;
        updates.store_match_status = "matched";
      }
      if (category_code !== undefined) {
        updates.category_code = category_code;
        updates.category_match_status = "matched";
      }

      const { data, error: dbError } = await supabaseAdmin
        .from("deals")
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq("id", id)
        .select()
        .single();

      if (dbError) throw dbError;

      return success(data, "Classification updated");
    } catch (err) {
      console.error("Deal classification error:", err);
      return error("Failed to update classification", "DB_ERROR");
    }
  });
}
