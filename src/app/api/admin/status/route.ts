import { auth } from "@clerk/nextjs/server";
import { supabaseAdmin } from "@/lib/supabase/client";
import { success, error } from "@/lib/api/response";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) {
      return error("Unauthorized", "UNAUTHORIZED", undefined, 401);
    }

    // Check Supabase connection
    const { data: clusters, error: dbError } = await supabaseAdmin
      .from("deal_clusters")
      .select("count")
      .limit(1);

    const supabaseConnected = !dbError;

    // Check pending counts
    const { count: pendingClusters } = await supabaseAdmin
      .from("deal_clusters")
      .select("count", { count: "exact", head: true })
      .eq("status", "closed");

    const { count: pendingDrafts } = await supabaseAdmin
      .from("drafts")
      .select("count", { count: "exact", head: true })
      .eq("status", "pending");

    const { count: activePrompts } = await supabaseAdmin
      .from("prompts")
      .select("count", { count: "exact", head: true })
      .eq("is_active", true);

    // Check AI provider
    const aiProvider = process.env.AI_PROVIDER || "not_configured";
    const openaiKey = process.env.OPENAI_API_KEY ? "configured" : "missing";

    // Check R2
    const r2Configured = !!(
      process.env.R2_ACCOUNT_ID &&
      process.env.R2_BUCKET &&
      process.env.R2_ACCESS_KEY_ID
    );

    return success({
      supabase: {
        connected: supabaseConnected,
        url: process.env.SUPABASE_URL,
      },
      ai: {
        provider: aiProvider,
        openai_key: openaiKey,
        extract_model: process.env.EXTRACT_MODEL,
        generate_model: process.env.GENERATE_COPY_MODEL,
      },
      r2: {
        configured: r2Configured,
        bucket: process.env.R2_BUCKET,
        public_url: process.env.R2_PUBLIC_BASE_URL,
      },
      pending: {
        closed_clusters: pendingClusters ?? 0,
        pending_drafts: pendingDrafts ?? 0,
      },
      prompts: {
        active: activePrompts ?? 0,
      },
      webhooks: {
        count: 0, // Will query later
      },
    });
  } catch (err) {
    console.error("Status API error:", err);
    return error(
      err instanceof Error ? err.message : "Internal server error",
      "INTERNAL_ERROR"
    );
  }
}
