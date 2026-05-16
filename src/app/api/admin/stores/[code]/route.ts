import { NextRequest } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/client";
import { withRole } from "@/lib/api/auth-guard";
import { success, error, notFound, badRequest } from "@/lib/api/response";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  return withRole("admin", async () => {
    try {
      const { code } = await params;
      const body = await request.json();
      const { name, name_cn, aliases, domains, is_active } = body;

      const updates: Record<string, unknown> = {};
      if (name !== undefined) updates.name = name;
      if (name_cn !== undefined) updates.name_cn = name_cn;
      if (aliases !== undefined) updates.aliases = aliases;
      if (domains !== undefined) updates.domains = domains;
      if (is_active !== undefined) updates.is_active = is_active;

      if (Object.keys(updates).length === 0) {
        return badRequest("No fields to update");
      }

      const { data, error: dbError } = await supabaseAdmin
        .from("stores")
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq("store_code", code)
        .select()
        .single();

      if (dbError) throw dbError;
      if (!data) return notFound("Store");

      return success(data, "Store updated");
    } catch (err) {
      console.error("Store update error:", err);
      return error("Failed to update store", "DB_ERROR");
    }
  });
}
