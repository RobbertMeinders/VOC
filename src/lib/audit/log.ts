import "server-only";

import { createClient } from "@/lib/supabase/server";

// Voor de betekenisvolle beheeracties die nergens al een eigen "wie/wanneer"-
// kolom hebben (zie 0059_audit_logs.sql) — nooit de aanroepende beheeractie
// laten mislukken als loggen om wat voor reden dan ook niet lukt, dus altijd
// zwijgend falen i.p.v. de fout door te laten.
export async function logAuditAction(
  action: string,
  targetType?: string,
  targetId?: string,
  metadata?: Record<string, unknown>
): Promise<void> {
  try {
    const supabase = await createClient();
    await supabase.rpc("log_audit_action", {
      p_action: action,
      p_target_type: targetType ?? null,
      p_target_id: targetId ?? null,
      p_metadata: metadata ?? {},
    });
  } catch (cause) {
    console.error("[audit] logAuditAction failed:", cause);
  }
}
