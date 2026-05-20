import { NextRequest } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/client";
import { withAuth, withRole } from "@/lib/api/auth-guard";
import { success, error, notFound, badRequest } from "@/lib/api/response";

function toNumber(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const n = Number(value);
    return Number.isFinite(n) ? n : 0;
  }
  if (typeof value === "boolean") return value ? 1 : 0;
  return 0;
}

function pickMetric(entry: Record<string, unknown>, keys: string[]): number {
  for (const key of keys) {
    if (key in entry) return toNumber(entry[key]);
  }
  return 0;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withAuth(async () => {
    try {
      const { id } = await params;
      const { data: deal, error: dealErr } = await supabaseAdmin
        .from("deals")
        .select(
          `*, stores:store_code(name, name_cn, aliases, domains), categories:category_code(category, subcategory, aliases)`
        )
        .eq("id", id)
        .single();

      if (dealErr || !deal) {
        return notFound("Deal");
      }

      const { data: drafts } = await supabaseAdmin
        .from("drafts")
        .select("id, title, body, status, created_at")
        .eq("deal_id", id)
        .order("created_at", { ascending: false });

      const draftIds = (drafts ?? []).map((d) => d.id);
      let draftMetrics: Record<string, { likes: number; clicks: number }> = {};
      if (draftIds.length > 0) {
        const { data: sendRecords } = await supabaseAdmin
          .from("draft_discord_sends")
          .select("*")
          .in("draft_id", draftIds);

        draftMetrics = (sendRecords ?? []).reduce((acc, row) => {
          const r = row as Record<string, unknown>;
          const draftId = String(r.draft_id ?? "");
          if (!draftId) return acc;

          const likes = pickMetric(r, [
            "like_count",
            "likes",
            "upvote_count",
            "upvotes",
            "reaction_count",
            "reactions",
            "thumbs_up_count",
          ]);
          const clicks = pickMetric(r, [
            "click_count",
            "clicks",
            "total_clicks",
            "url_click_count",
            "url_clicks",
          ]);

          if (!acc[draftId]) acc[draftId] = { likes: 0, clicks: 0 };
          acc[draftId].likes += likes;
          acc[draftId].clicks += clicks;
          return acc;
        }, {} as Record<string, { likes: number; clicks: number }>);
      }

      // Images are associated with clusters, not deals directly
      const clusterId = (deal as { cluster_id?: string | null }).cluster_id;
      let images: Array<Record<string, unknown>> = [];
      if (clusterId) {
        const { data: clusterImages } = await supabaseAdmin
          .from("images")
          .select("id, r2_original_url, r2_thumbnail_url, role, selected_for_draft, width, height")
          .eq("cluster_id", clusterId)
          .order("created_at", { ascending: false });
        images = clusterImages ?? [];
      }

      const { data: updates } = await supabaseAdmin
        .from("deal_updates")
        .select("*")
        .eq("deal_id", id)
        .order("created_at", { ascending: false })
        .limit(20);

      return success({
        deal,
        drafts: (drafts ?? []).map((d) => ({
          ...d,
          likes: draftMetrics[d.id]?.likes ?? 0,
          clicks: draftMetrics[d.id]?.clicks ?? 0,
        })),
        images: images ?? [],
        updates: updates ?? [],
      });
    } catch (err) {
      console.error("Deal detail error:", err);
      return error("Failed to fetch deal details", "DB_ERROR");
    }
  });
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withRole("operator", async () => {
    try {
      const { id } = await params;

      const { data, error: dbError } = await supabaseAdmin
        .from("deals")
        .delete()
        .eq("id", id)
        .select("id")
        .single();

      if (dbError) {
        if ((dbError as { code?: string }).code === "PGRST116") {
          return notFound("Deal");
        }
        throw dbError;
      }

      return success({ id: data.id }, "Deal deleted");
    } catch (err) {
      console.error("Deal delete error:", err);
      return error("Failed to delete deal", "DB_ERROR");
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
      const body = (await request.json()) as Record<string, unknown>;

      if (!body || typeof body !== "object") {
        return badRequest("Invalid request body");
      }

      const updates: Record<string, unknown> = { ...body };

      // Immutable/system-managed fields
      delete updates.id;
      delete updates.created_at;
      delete updates.updated_at;
      delete updates.stores;
      delete updates.categories;

      if (Object.keys(updates).length === 0) {
        return badRequest("No updatable fields provided");
      }

      const { data, error: dbError } = await supabaseAdmin
        .from("deals")
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq("id", id)
        .select(
          `*, stores:store_code(name, name_cn, aliases, domains), categories:category_code(category, subcategory, aliases)`
        )
        .single();

      if (dbError) throw dbError;

      return success(data, "Deal updated");
    } catch (err) {
      console.error("Deal update error:", err);
      return error("Failed to update deal", "DB_ERROR");
    }
  });
}
