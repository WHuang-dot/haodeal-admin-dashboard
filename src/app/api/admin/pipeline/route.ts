import { NextRequest } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/client";
import { withRole } from "@/lib/api/auth-guard";
import { success, error } from "@/lib/api/response";

export async function POST(request: NextRequest) {
  return withRole("operator", async () => {
    try {
      const body = await request.json();
      const { step } = body;

      const result = {
        scanned: 0,
        processed: 0,
        skipped: 0,
        failed: 0,
        errors: [] as string[],
      };

      if (!step || step === "full" || step === "close_stale") {
        const { data: staleClusters, error: staleErr } = await supabaseAdmin
          .from("deal_clusters")
          .select("id")
          .eq("status", "open")
          .lt("last_message_at", new Date(Date.now() - 30 * 60 * 1000).toISOString());

        if (!staleErr && staleClusters) {
          result.scanned += staleClusters.length;
          for (const cluster of staleClusters) {
            const { error: updateErr } = await supabaseAdmin
              .from("deal_clusters")
              .update({ status: "closed", updated_at: new Date().toISOString() })
              .eq("id", cluster.id);

            if (updateErr) {
              result.failed++;
              result.errors.push(`Failed to close cluster ${cluster.id}`);
            } else {
              result.processed++;
            }
          }
        }
      }

      return success(result, `Pipeline step '${step ?? "full"}' completed`);
    } catch (err) {
      console.error("Pipeline error:", err);
      return error("Pipeline execution failed", "PIPELINE_ERROR");
    }
  });
}
