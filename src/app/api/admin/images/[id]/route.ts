import { NextRequest } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/client";
import { withRole } from "@/lib/api/auth-guard";
import { success, error } from "@/lib/api/response";
import { deleteObjectFromR2 } from "@/lib/api/r2-upload";

type ImageRow = {
  id: string;
  r2_original_key: string | null;
  r2_thumbnail_key: string | null;
};

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withRole("operator", async () => {
    try {
      const { id } = await params;

      const { data: image, error: imageError } = await supabaseAdmin
        .from("images")
        .select("id, r2_original_key, r2_thumbnail_key")
        .eq("id", id)
        .single<ImageRow>();

      if (imageError || !image) {
        return error("Image not found", "NOT_FOUND", undefined, 404);
      }

      const keys = Array.from(
        new Set(
          [image.r2_original_key, image.r2_thumbnail_key]
            .map((k) => (k || "").trim())
            .filter(Boolean)
        )
      );

      for (const key of keys) {
        await deleteObjectFromR2(key);
      }

      const { error: deleteError } = await supabaseAdmin
        .from("images")
        .delete()
        .eq("id", id);

      if (deleteError) throw deleteError;

      return success({ id, deletedKeys: keys }, "Image deleted");
    } catch (err) {
      console.error("Image delete error:", err);
      return error("Failed to delete image", "DB_ERROR");
    }
  });
}
