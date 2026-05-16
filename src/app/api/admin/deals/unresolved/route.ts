import { NextRequest } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/client";
import { withAuth } from "@/lib/api/auth-guard";
import { success, error, notFound } from "@/lib/api/response";

export async function GET(request: NextRequest) {
  return withAuth(async () => {
    try {
      const { searchParams } = new URL(request.url);
      const limit = parseInt(searchParams.get("limit") ?? "20", 10);
      const offset = parseInt(searchParams.get("offset") ?? "0", 10);

      let query = supabaseAdmin
        .from("deals")
        .select(
          `*, stores:store_code(name, name_cn), categories:category_code(category, subcategory)`,
          { count: "exact" }
        )
        .or("store_match_status.eq.unmatched,category_match_status.eq.unmatched")
        .order("created_at", { ascending: false })
        .range(offset, offset + limit - 1);

      const { data, error: dbError, count } = await query;

      if (dbError) throw dbError;

      return success({
        data: data ?? [],
        total: count ?? 0,
        limit,
        offset,
      });
    } catch (err) {
      console.error("Unresolved deals error:", err);
      return error("Failed to fetch unresolved deals", "DB_ERROR");
    }
  });
}
