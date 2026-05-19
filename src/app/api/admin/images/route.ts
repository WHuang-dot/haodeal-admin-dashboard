import { NextRequest } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/client";
import { withAuth } from "@/lib/api/auth-guard";
import { success, error } from "@/lib/api/response";

type ImageDbRow = {
  id: string;
  r2_original_url: string | null;
  source_url: string | null;
  r2_thumbnail_url: string | null;
  role: string | null;
  width: number | null;
  height: number | null;
  selected_for_draft: boolean | null;
  r2_original_key: string | null;
  r2_thumbnail_key: string | null;
  image_provider: string | null;
  deal_id: string | null;
  cluster_id: string | null;
  draft_id: string | null;
};

type DealDbRow = {
  id: string;
  title_cn: string | null;
  title_en: string | null;
};

export async function GET(request: NextRequest) {
  return withAuth(async () => {
    try {
      const { searchParams } = new URL(request.url);
      const dealId = searchParams.get("deal_id") ?? undefined;
      const clusterId = searchParams.get("cluster_id") ?? undefined;
      const draftId = searchParams.get("draft_id") ?? undefined;
      const role = searchParams.get("role") ?? undefined;
      const limit = parseInt(searchParams.get("limit") ?? "50", 10);
      const offset = parseInt(searchParams.get("offset") ?? "0", 10);

      let query = supabaseAdmin
        .from("images")
        .select("*", { count: "exact" });

      if (dealId) query = query.eq("deal_id", dealId);
      if (clusterId) query = query.eq("cluster_id", clusterId);
      if (draftId) query = query.eq("draft_id", draftId);
      if (role) query = query.eq("role", role);

      query = query.order("created_at", { ascending: false });
      query = query.range(offset, offset + limit - 1);

      const { data: rawData, error: dbError, count } = await query;

      if (dbError) throw dbError;

      const clusterIdsNeedingFallback = Array.from(
        new Set(
          (rawData ?? [])
            .map((img) => img as ImageDbRow)
            .filter((img) => !img.deal_id && typeof img.cluster_id === "string" && img.cluster_id.length > 0)
            .map((img) => img.cluster_id as string)
        )
      );

      const clusterToDealMap = new Map<string, string>();
      if (clusterIdsNeedingFallback.length > 0) {
        const { data: clusterRows, error: clusterError } = await supabaseAdmin
          .from("deal_clusters")
          .select("cluster_id, deal_id")
          .in("cluster_id", clusterIdsNeedingFallback);

        if (clusterError) throw clusterError;

        for (const row of clusterRows ?? []) {
          const clusterId = (row as { cluster_id?: unknown }).cluster_id;
          const dealIdFromCluster = (row as { deal_id?: unknown }).deal_id;
          if (
            typeof clusterId === "string" &&
            typeof dealIdFromCluster === "string" &&
            !clusterToDealMap.has(clusterId)
          ) {
            clusterToDealMap.set(clusterId, dealIdFromCluster);
          }
        }
      }

      const dealIds = Array.from(
        new Set(
          (rawData ?? [])
            .map((img) => {
              const row = img as ImageDbRow;
              if (row.deal_id) return row.deal_id;
              if (row.cluster_id && clusterToDealMap.has(row.cluster_id)) {
                return clusterToDealMap.get(row.cluster_id) ?? null;
              }
              return null;
            })
            .filter((id: unknown): id is string => typeof id === "string" && id.length > 0)
        )
      );

      const dealsMap = new Map<
        string,
        { id: string; title_cn: string | null; title_en: string | null }
      >();

      if (dealIds.length > 0) {
        const { data: dealsData, error: dealsError } = await supabaseAdmin
          .from("deals")
          .select("id, title_cn, title_en")
          .in("id", dealIds);

        if (dealsError) throw dealsError;

        for (const deal of dealsData ?? []) {
          const row = deal as DealDbRow;
          dealsMap.set(row.id, {
            id: row.id,
            title_cn: row.title_cn ?? null,
            title_en: row.title_en ?? null,
          });
        }
      }

      // Map DB field names to API field names
      const mappedData = (rawData ?? []).map((row) => {
        const img = row as ImageDbRow;
        const resolvedDealId =
          img.deal_id || (img.cluster_id ? clusterToDealMap.get(img.cluster_id) ?? null : null);
        return {
        id: img.id,
        url: img.r2_original_url || img.source_url || "",
        thumbnail_url: img.r2_thumbnail_url || img.r2_original_url || img.source_url || "",
        role: img.role || "source",
        width: img.width || 0,
        height: img.height || 0,
        selected_for_draft: img.selected_for_draft || false,
        r2_key: img.r2_original_key || img.r2_thumbnail_key || "",
        provider: img.image_provider || "r2",
        deal_id: resolvedDealId,
        draft_id: img.draft_id,
        deal:
          typeof resolvedDealId === "string" && dealsMap.has(resolvedDealId)
            ? dealsMap.get(resolvedDealId)
            : null,
      }});

      return success({
        data: mappedData,
        total: count ?? 0,
        limit,
        offset,
      });
    } catch (err) {
      console.error("Images list error:", err);
      return error("Failed to fetch images", "DB_ERROR");
    }
  });
}
