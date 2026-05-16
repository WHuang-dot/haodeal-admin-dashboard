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
      const { data, error: dbError } = await supabaseAdmin
        .from("deal_clusters")
        .update({ status: "extracted", updated_at: new Date().toISOString() })
        .eq("id", id)
        .select()
        .single();

      if (dbError) throw dbError;
      return success(data, "Cluster marked for extraction");
    } catch (err) {
      console.error("Cluster extract error:", err);
      return error("Failed to extract cluster", "DB_ERROR");
    }
  });
}
