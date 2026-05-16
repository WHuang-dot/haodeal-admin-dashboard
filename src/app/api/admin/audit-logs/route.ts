import { NextRequest } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/client";
import { withRole } from "@/lib/api/auth-guard";
import { success, error } from "@/lib/api/response";

export async function GET(request: NextRequest) {
  return withRole("admin", async () => {
    try {
      const { searchParams } = new URL(request.url);
      const limit = parseInt(searchParams.get("limit") ?? "50", 10);
      const offset = parseInt(searchParams.get("offset") ?? "0", 10);
      const action = searchParams.get("action") ?? undefined;
      const table = searchParams.get("table") ?? undefined;

      let query = supabaseAdmin
        .from("admin_audit_logs")
        .select("*", { count: "exact" });

      if (action) query = query.eq("action", action);
      if (table) query = query.eq("target_table", table);

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
      console.error("Audit logs error:", err);
      return error("Failed to fetch audit logs", "DB_ERROR");
    }
  });
}
