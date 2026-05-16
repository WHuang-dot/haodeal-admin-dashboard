import { NextRequest } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/client";
import { withRole } from "@/lib/api/auth-guard";
import { success, error } from "@/lib/api/response";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withRole("operator", async () => {
    try {
      const { id } = await params;
      const body = await request.json();
      const { image_ids } = body;

      if (!image_ids || !Array.isArray(image_ids)) {
        return error("image_ids array required", "BAD_REQUEST", undefined, 400);
      }

      const { data, error: dbError } = await supabaseAdmin
        .from("drafts")
        .update({
          selected_image_ids: image_ids,
          updated_at: new Date().toISOString(),
        })
        .eq("id", id)
        .select()
        .single();

      if (dbError) throw dbError;
      return success(data, "Cover images updated");
    } catch (err) {
      console.error("Draft cover error:", err);
      return error("Failed to update cover images", "DB_ERROR");
    }
  });
}
