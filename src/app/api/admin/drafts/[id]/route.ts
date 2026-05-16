import { NextRequest } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/client";
import { withRole } from "@/lib/api/auth-guard";
import { success, error, notFound, badRequest } from "@/lib/api/response";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withRole("operator", async () => {
    try {
      const { id } = await params;
      const { data: draft, error: draftErr } = await supabaseAdmin
        .from("drafts")
        .select(`*, deals:deal_id(*)`)
        .eq("id", id)
        .single();

      if (draftErr || !draft) {
        return notFound("Draft");
      }

      const { data: sendRecords } = await supabaseAdmin
        .from("draft_discord_sends")
        .select("*")
        .eq("draft_id", id)
        .order("created_at", { ascending: false });

      const selectedIds = draft.selected_image_ids || [];

      return success({
        id: draft.id,
        title: draft.title,
        body: draft.body,
        status: draft.status,
        model: draft.model,
        created_at: draft.created_at,
        updated_at: draft.updated_at,
        selected_image_ids: selectedIds,
        deal: draft.deals,
        send_history: sendRecords ?? [],
      });
    } catch (err) {
      console.error("Draft detail error:", err);
      return error("Failed to fetch draft details", "DB_ERROR");
    }
  });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withRole("operator", async () => {
    try {
      const { id } = await params;
      const payload = await request.json();
      const { title, body, human_notes } = payload;

      const updates: Record<string, unknown> = {};
      if (title !== undefined) updates.title = title;
      if (body !== undefined) updates.body = body;
      if (human_notes !== undefined) updates.human_notes = human_notes;

      if (Object.keys(updates).length === 0) {
        return badRequest("No fields to update");
      }

      const { data, error: dbError } = await supabaseAdmin
        .from("drafts")
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq("id", id)
        .select()
        .single();

      if (dbError) throw dbError;
      return success(data, "Draft updated");
    } catch (err) {
      console.error("Draft update error:", err);
      return error("Failed to update draft", "DB_ERROR");
    }
  });
}
