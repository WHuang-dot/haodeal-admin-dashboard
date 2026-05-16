import { NextRequest } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/client";
import { withAuth } from "@/lib/api/auth-guard";
import { success, error } from "@/lib/api/response";

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

      // Map DB field names to API field names
      const mappedData = (rawData ?? []).map((img: any) => ({
        id: img.id,
        url: img.r2_original_url || img.source_url || "",
        thumbnail_url: img.r2_thumbnail_url || img.r2_original_url || img.source_url || "",
        role: img.role || "source",
        width: img.width || 0,
        height: img.height || 0,
        selected_for_draft: img.selected_for_draft || false,
        r2_key: img.r2_original_key || img.r2_thumbnail_key || "",
        provider: img.image_provider || "r2",
        deal_id: img.deal_id,
        draft_id: img.draft_id,
        deal: null,
      }));

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
