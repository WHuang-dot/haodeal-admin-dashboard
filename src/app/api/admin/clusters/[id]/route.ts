import { NextRequest } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/client";
import { withAuth } from "@/lib/api/auth-guard";
import { success, error, notFound } from "@/lib/api/response";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withAuth(async () => {
    try {
      const { id } = await params;
      const { data: cluster, error: clusterErr } = await supabaseAdmin
        .from("deal_clusters")
        .select("*")
        .eq("id", id)
        .single();

      if (clusterErr || !cluster) {
        return notFound("Cluster");
      }

      const { data: messages } = await supabaseAdmin
        .from("raw_messages")
        .select("*")
        .eq("cluster_id", id)
        .order("created_at", { ascending: true });

      const { data: deals } = await supabaseAdmin
        .from("deals")
        .select("id, title_en, title_cn, platform, brand, created_at, store_match_status, category_match_status")
        .eq("cluster_id", id);

      return success({
        cluster,
        messages: messages ?? [],
        deals: deals ?? [],
      });
    } catch (err) {
      console.error("Cluster detail error:", err);
      return error("Failed to fetch cluster details", "DB_ERROR");
    }
  });
}
