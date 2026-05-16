import { NextRequest } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/client";
import { withRole } from "@/lib/api/auth-guard";
import { success, error } from "@/lib/api/response";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ kind: string; name: string }> }
) {
  return withRole("admin", async () => {
    try {
      const { kind, name } = await params;

      // Deactivate all other prompts of same kind
      await supabaseAdmin
        .from("prompts")
        .update({ is_active: false })
        .eq("kind", kind);

      // Activate the selected prompt
      const { data, error: dbError } = await supabaseAdmin
        .from("prompts")
        .update({ is_active: true, updated_at: new Date().toISOString() })
        .eq("kind", kind)
        .eq("name", name)
        .select()
        .single();

      if (dbError) throw dbError;
      return success(data, `Prompt '${name}' activated for ${kind}`);
    } catch (err) {
      console.error("Prompt activate error:", err);
      return error("Failed to activate prompt", "DB_ERROR");
    }
  });
}
