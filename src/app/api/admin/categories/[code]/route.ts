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

      // Protect A999
      if (code === "A999") {
        return error("Cannot modify 'A999 其他' category", "PROTECTED", undefined, 403);
      }

      const body = await request.json();
      const { category, subcategory, aliases, is_active } = body;

      const updates: Record<string, unknown> = {};
      if (category !== undefined) updates.category = category;
      if (subcategory !== undefined) updates.subcategory = subcategory;
      if (aliases !== undefined) updates.aliases = aliases;
      if (is_active !== undefined) updates.is_active = is_active;

      if (Object.keys(updates).length === 0) {
        return badRequest("No fields to update");
      }

      const { data, error: dbError } = await supabaseAdmin
        .from("categories")
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq("category_code", code)
        .select()
        .single();

      if (dbError) throw dbError;
      if (!data) return notFound("Category");

      return success(data, "Category updated");
    } catch (err) {
      console.error("Category update error:", err);
      return error("Failed to update category", "DB_ERROR");
    }
  });
}
