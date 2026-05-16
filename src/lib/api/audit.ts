import { supabaseAdmin } from "@/lib/supabase/client";
import { AuditLogEntry } from "@/types";

interface AuditLogParams {
  userId: string;
  userEmail: string;
  action: string;
  targetTable: string;
  targetId: string;
  before?: Record<string, unknown>;
  after?: Record<string, unknown>;
}

/**
 * Write an audit log entry for mutation operations.
 * Should be called after any create/update/delete operation.
 */
export async function writeAuditLog({
  userId,
  userEmail,
  action,
  targetTable,
  targetId,
  before,
  after,
}: AuditLogParams): Promise<AuditLogEntry | null> {
  try {
    const { data, error } = await supabaseAdmin
      .from("admin_audit_logs")
      .insert({
        user_id: userId,
        user_email: userEmail,
        action,
        target_table: targetTable,
        target_id: targetId,
        before: before ?? null,
        after: after ?? null,
      })
      .select()
      .single();

    if (error) {
      console.error("Failed to write audit log:", error);
      return null;
    }

    return data as AuditLogEntry;
  } catch (err) {
    console.error("Audit log exception:", err);
    return null;
  }
}
