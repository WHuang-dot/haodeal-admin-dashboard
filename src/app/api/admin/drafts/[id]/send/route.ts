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
      const { data, error: dbError } = await supabaseAdmin
        .from("drafts")
        .update({ status: "published", updated_at: new Date().toISOString() })
        .eq("id", id)
        .select()
        .single();

      if (dbError) throw dbError;
      return success(data, "Draft sent successfully");
    } catch (err) {
      console.error("Draft send error:", err);
      return error("Failed to send draft", "DB_ERROR");
    }
  });
}
