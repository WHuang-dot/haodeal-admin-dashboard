import { NextRequest } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/client";
import { withRole } from "@/lib/api/auth-guard";
import { success, error } from "@/lib/api/response";

export async function GET(request: NextRequest) {
  return withRole("admin", async () => {
    try {
      const { data, error: dbError } = await supabaseAdmin
        .from("write_webhook")
        .select("*")
        .order("created_at", { ascending: false });

      if (dbError) throw dbError;

      // Mask webhook URLs
      const masked = (data ?? []).map((w: Record<string, unknown>) => ({
        ...w,
        webhook: typeof w.webhook === "string" ? maskUrl(w.webhook) : w.webhook,
      }));

      return success(masked);
    } catch (err) {
      console.error("Webhooks list error:", err);
      return error("Failed to fetch webhooks", "DB_ERROR");
    }
  });
}

function maskUrl(url: string): string {
  try {
    const u = new URL(url);
    const path = u.pathname + u.search;
    return `${u.protocol}//${u.hostname}/****${path.slice(-8)}`;
  } catch {
    return url.slice(0, 20) + "****";
  }
}
