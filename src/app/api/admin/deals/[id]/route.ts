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
      const { data: deal, error: dealErr } = await supabaseAdmin
        .from("deals")
        .select(
          `*, stores:store_code(name, name_cn, aliases, domains), categories:category_code(category, subcategory, aliases)`
        )
        .eq("id", id)
        .single();

      if (dealErr || !deal) {
        return notFound("Deal");
      }

      const { data: drafts } = await supabaseAdmin
        .from("drafts")
        .select("id, title, body, status, created_at")
        .eq("deal_id", id)
        .order("created_at", { ascending: false });

      // Images are associated with clusters, not deals directly
      const clusterId = (deal as any).cluster_id;
      let images: any[] = [];
      if (clusterId) {
        const { data: clusterImages } = await supabaseAdmin
          .from("images")
          .select("id, r2_original_url, r2_thumbnail_url, role, selected_for_draft, width, height")
          .eq("cluster_id", clusterId)
          .order("created_at", { ascending: false });
        images = clusterImages ?? [];
      }

      const { data: updates } = await supabaseAdmin
        .from("deal_updates")
        .select("*")
        .eq("deal_id", id)
        .order("created_at", { ascending: false })
        .limit(20);

      return success({
        deal,
        drafts: drafts ?? [],
        images: images ?? [],
        updates: updates ?? [],
      });
    } catch (err) {
      console.error("Deal detail error:", err);
      return error("Failed to fetch deal details", "DB_ERROR");
    }
  });
}
