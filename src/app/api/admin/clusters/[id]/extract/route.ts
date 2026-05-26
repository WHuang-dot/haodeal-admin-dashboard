import { NextRequest } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/client";
import { withRole } from "@/lib/api/auth-guard";
import { success, error, notFound, badRequest } from "@/lib/api/response";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withRole("operator", async () => {
    try {
      const { id } = await params;

      const { data: cluster, error: fetchError } = await supabaseAdmin
        .from("deal_clusters")
        .select("id, status")
        .eq("id", id)
        .single();

      if (fetchError || !cluster) {
        return notFound("Cluster");
      }

      if (cluster.status === "open") {
        return badRequest(
          "Open clusters are still collecting messages and cannot be re-queued"
        );
      }

      const { data, error: dbError } = await supabaseAdmin
        .from("deal_clusters")
        .update({
          status: "closed",
          error: null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", id)
        .select()
        .single();

      if (dbError) throw dbError;
      return success(
        data,
        "Cluster re-queued for extraction (status set to closed)"
      );
    } catch (err) {
      console.error("Cluster re-queue error:", err);
      return error("Failed to re-queue cluster", "DB_ERROR");
    }
  });
}
