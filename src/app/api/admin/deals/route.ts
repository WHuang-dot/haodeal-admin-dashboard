import { NextRequest } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/client";
import { withAuth } from "@/lib/api/auth-guard";
import { success, error } from "@/lib/api/response";
import { fetchList } from "@/lib/api/db-helpers";

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

      return success({
        data: data ?? [],
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
