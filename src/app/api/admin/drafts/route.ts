import { NextRequest } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/client";
import { withRole } from "@/lib/api/auth-guard";
import { success, error } from "@/lib/api/response";

export async function GET(request: NextRequest) {
  return withRole("operator", async () => {
    try {
      const { searchParams } = new URL(request.url);
      const status = searchParams.get("status") ?? undefined;
      const dealId = searchParams.get("deal_id") ?? undefined;
      const limit = parseInt(searchParams.get("limit") ?? "20", 10);
      const offset = parseInt(searchParams.get("offset") ?? "0", 10);

      let query = supabaseAdmin
        .from("drafts")
        .select(`*, deals:deal_id(title_en, title_cn, brand)`, { count: "exact" });

      if (status) query = query.eq("status", status);
      if (dealId) query = query.eq("deal_id", dealId);

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
      console.error("Drafts list error:", err);
      return error("Failed to fetch drafts", "DB_ERROR");
    }
  });
}
