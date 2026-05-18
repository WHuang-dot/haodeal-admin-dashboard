import { NextRequest } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/client";
import { withAuth } from "@/lib/api/auth-guard";
import { success, error } from "@/lib/api/response";

function toNumber(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const n = Number(value);
    return Number.isFinite(n) ? n : 0;
  }
  if (typeof value === "boolean") return value ? 1 : 0;
  return 0;
}

function pickMetric(entry: Record<string, unknown>, keys: string[]): number {
  for (const key of keys) {
    if (key in entry) return toNumber(entry[key]);
  }
  return 0;
}

export async function GET(request: NextRequest) {
  return withAuth(async () => {
    try {
      const { searchParams } = new URL(request.url);
      const status = searchParams.get("status") ?? undefined;
      const storeCode = searchParams.get("store_code") ?? undefined;
      const categoryCode = searchParams.get("category_code") ?? undefined;
      const search = searchParams.get("search") ?? undefined;
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
        query = query.or(
          `title_en.ilike.%${search}%,title_cn.ilike.%${search}%,brand.ilike.%${search}%,coupon_code.ilike.%${search}%`
        );
      }

      query = query.order("created_at", { ascending: false });
      query = query.range(offset, offset + limit - 1);

      const { data, error: dbError, count } = await query;

      if (dbError) throw dbError;

      const deals = data ?? [];
      const dealIds = deals.map((d) => String((d as Record<string, unknown>).id ?? ""));
      let metricsByDeal: Record<string, { likes: number; clicks: number }> = {};

      if (dealIds.length > 0) {
        const { data: drafts } = await supabaseAdmin
          .from("drafts")
          .select("id, deal_id")
          .in("deal_id", dealIds);

        const draftIds = (drafts ?? []).map((d) => d.id);
        const draftToDeal = (drafts ?? []).reduce((acc, d) => {
          acc[String(d.id)] = String(d.deal_id ?? "");
          return acc;
        }, {} as Record<string, string>);

        if (draftIds.length > 0) {
          const { data: sends } = await supabaseAdmin
            .from("draft_discord_sends")
            .select("*")
            .in("draft_id", draftIds);

          metricsByDeal = (sends ?? []).reduce((acc, row) => {
            const r = row as Record<string, unknown>;
            const draftId = String(r.draft_id ?? "");
            const dealId = draftToDeal[draftId];
            if (!dealId) return acc;

            const likes = pickMetric(r, [
              "like_count",
              "likes",
              "upvote_count",
              "upvotes",
              "reaction_count",
              "reactions",
              "thumbs_up_count",
            ]);
            const clicks = pickMetric(r, [
              "click_count",
              "clicks",
              "total_clicks",
              "url_click_count",
              "url_clicks",
            ]);

            if (!acc[dealId]) acc[dealId] = { likes: 0, clicks: 0 };
            acc[dealId].likes += likes;
            acc[dealId].clicks += clicks;
            return acc;
          }, {} as Record<string, { likes: number; clicks: number }>);
        }
      }

      return success({
        data: deals.map((deal) => {
          const row = deal as Record<string, unknown>;
          const dealId = String(row.id ?? "");
          return {
            ...row,
            likes: metricsByDeal[dealId]?.likes ?? 0,
            clicks: metricsByDeal[dealId]?.clicks ?? 0,
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
