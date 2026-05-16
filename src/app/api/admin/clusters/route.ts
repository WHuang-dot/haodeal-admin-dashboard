import { NextRequest } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/client";
import { withAuth } from "@/lib/api/auth-guard";
import { success, error, badRequest } from "@/lib/api/response";
import { fetchList } from "@/lib/api/db-helpers";

export async function GET(request: NextRequest) {
  return withAuth(async () => {
    try {
      const { searchParams } = new URL(request.url);
      const status = searchParams.get("status") ?? undefined;
      const limit = parseInt(searchParams.get("limit") ?? "20", 10);
      const offset = parseInt(searchParams.get("offset") ?? "0", 10);

      const filters: Record<string, string | undefined> = {};
      if (status) filters.status = status;

      const result = await fetchList({
        table: "deal_clusters",
        filters,
        limit,
        offset,
        sort: "updated_at",
        order: "desc",
      });

      return success(result);
    } catch (err) {
      console.error("Clusters list error:", err);
      return error("Failed to fetch clusters", "DB_ERROR");
    }
  });
}
