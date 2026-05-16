import { NextRequest } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/client";
import { withRole } from "@/lib/api/auth-guard";
import { success, error } from "@/lib/api/response";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withRole("operator", async () => {
    try {
      const { id } = await params;
      const body = await request.json();
      const { status } = body;

      if (!status || !["pending", "approved", "rejected", "published"].includes(status)) {
        return error("Invalid status", "BAD_REQUEST", undefined, 400);
      }

      const { data, error: dbError } = await supabaseAdmin
        .from("drafts")
        .update({ status, updated_at: new Date().toISOString() })
        .eq("id", id)
        .select()
        .single();

      if (dbError) throw dbError;
      return success(data, `Draft marked as ${status}`);
    } catch (err) {
      console.error("Draft status error:", err);
      return error("Failed to update draft status", "DB_ERROR");
    }
  });
}
