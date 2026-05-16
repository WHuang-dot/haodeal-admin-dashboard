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
      const { data: deal } = await supabaseAdmin
        .from("deals")
        .select("id")
        .eq("id", id)
        .single();

      if (!deal) {
        return error("Deal not found", "NOT_FOUND", undefined, 404);
      }

      // Create a draft placeholder - actual generation happens in background
      const { data: draft, error: draftErr } = await supabaseAdmin
        .from("drafts")
        .insert({
          deal_id: id,
          status: "pending",
          title: "",
          body: "",
          model: process.env.GENERATE_COPY_MODEL ?? "gpt-4o",
        })
        .select()
        .single();

      if (draftErr) throw draftErr;

      return success(draft, "Draft generation queued");
    } catch (err) {
      console.error("Draft generate error:", err);
      return error("Failed to generate draft", "DB_ERROR");
    }
  });
}
