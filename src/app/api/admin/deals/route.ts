import { NextRequest } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/client";
import { withAuth } from "@/lib/api/auth-guard";
import { success, error } from "@/lib/api/response";

type DealRow = Record<string, unknown> & {
  cluster_id?: string | null;
};

type ImageCoverRow = {
  cluster_id: string | null;
  r2_original_url: string | null;
  r2_thumbnail_url: string | null;
  source_url: string | null;
  created_at: string | null;
};

export async function GET(request: NextRequest) {
  return withAuth(async () => {
    try {
      const { searchParams } = new URL(request.url);
      const status = searchParams.get("status") ?? undefined;
      const storeCode = searchParams.get("store_code") ?? undefined;
      const categoryCode = searchParams.get("category_code") ?? undefined;
      const search = searchParams.get("search")?.trim() ?? "";
      const unresolved = searchParams.get("unresolved") === "true";
      const limit = parseInt(searchParams.get("limit") ?? "20", 10);
      const offset = parseInt(searchParams.get("offset") ?? "0", 10);

      let query = supabaseAdmin
        .from("deals")
        .select(
          `*, stores:store_code(name, name_cn), categories:category_code(category, subcategory)`,
          { count: "exact" }
        );

      if (status) query = query.eq("status", status);
      if (storeCode) query = query.eq("store_code", storeCode);
      if (categoryCode) query = query.eq("category_code", categoryCode);
      if (unresolved) {
        query = query.or("store_match_status.eq.unmatched,category_match_status.eq.unmatched");
      }
      if (search) {
        // Keep the query grammar simple and robust for PostgREST OR filters.
        const safeSearch = search.replace(/[%]/g, "\\%").replace(/[_]/g, "\\_");
        const isUuid =
          /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
            safeSearch
          );

        if (isUuid) {
          // UUID search uses direct equality to avoid PostgREST OR parser/type edge cases.
          query = query.eq("id", safeSearch);
        } else {
          const keywordConditions = [
            `title_en.ilike.%${safeSearch}%`,
            `title_cn.ilike.%${safeSearch}%`,
            `brand.ilike.%${safeSearch}%`,
            `store_code.ilike.%${safeSearch}%`,
            `category_code.ilike.%${safeSearch}%`,
          ];
          query = query.or(keywordConditions.join(","));
        }
      }

      query = query.order("created_at", { ascending: false });
      query = query.range(offset, offset + limit - 1);

      const { data, error: dbError, count } = await query;

      if (dbError) throw dbError;

      const deals = (data ?? []) as DealRow[];
      const clusterIds = Array.from(
        new Set(
          deals
            .map((row) => row.cluster_id)
            .filter((id): id is string => typeof id === "string" && id.length > 0)
        )
      );

      const coverByCluster = new Map<
        string,
        { cover_image_url: string | null; cover_thumbnail_url: string | null }
      >();

      if (clusterIds.length > 0) {
        const { data: sourceImages, error: sourceError } = await supabaseAdmin
          .from("images")
          .select("cluster_id, r2_original_url, r2_thumbnail_url, source_url, created_at")
          .in("cluster_id", clusterIds)
          .eq("role", "source")
          .order("created_at", { ascending: false });

        if (sourceError) throw sourceError;

        for (const img of (sourceImages ?? []) as ImageCoverRow[]) {
          if (!img.cluster_id || coverByCluster.has(img.cluster_id)) continue;
          coverByCluster.set(img.cluster_id, {
            cover_image_url: img.r2_original_url || img.source_url || null,
            cover_thumbnail_url:
              img.r2_thumbnail_url || img.r2_original_url || img.source_url || null,
          });
        }

        const missingClusterIds = clusterIds.filter((id) => !coverByCluster.has(id));

        if (missingClusterIds.length > 0) {
          const { data: fallbackImages, error: fallbackError } = await supabaseAdmin
            .from("images")
            .select("cluster_id, r2_original_url, r2_thumbnail_url, source_url, created_at")
            .in("cluster_id", missingClusterIds)
            .order("created_at", { ascending: false });

          if (fallbackError) throw fallbackError;

          for (const img of (fallbackImages ?? []) as ImageCoverRow[]) {
            if (!img.cluster_id || coverByCluster.has(img.cluster_id)) continue;
            coverByCluster.set(img.cluster_id, {
              cover_image_url: img.r2_original_url || img.source_url || null,
              cover_thumbnail_url:
                img.r2_thumbnail_url || img.r2_original_url || img.source_url || null,
            });
          }
        }
      }

      return success({
        data: deals.map((row) => {
          const clusterId = row.cluster_id;
          const cover =
            typeof clusterId === "string" ? coverByCluster.get(clusterId) : undefined;
          return {
            ...row,
            likes: Number(row.like_count ?? 0) || 0,
            clicks: Number(row.view_count ?? 0) || 0,
            cover_image_url: cover?.cover_image_url ?? null,
            cover_thumbnail_url: cover?.cover_thumbnail_url ?? null,
          };
        }),
        total: count ?? 0,
        limit,
        offset,
      });
    } catch (err) {
      console.error("Deals list error:", err);
      return error("Failed to fetch deals", "DB_ERROR");
    }
  });
}
