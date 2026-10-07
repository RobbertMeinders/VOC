"use server";

import { revalidatePath } from "next/cache";
import { requireBoard } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { logAuditAction } from "@/lib/audit/log";

// Verwijderen van het gerapporteerde bericht markeert de rapportage meteen
// als afgehandeld (cascade via post_id zou de rij zelf verwijderen — dat
// zou het overzicht van "wat is er ooit gerapporteerd" verliezen, dus
// bewust eerst de rapportage bijwerken vóór het bericht weg is).
export async function resolveReportAction(reportId: string, decision: "deleted" | "dismissed", postId: string | null) {
  await requireBoard();
  const supabase = await createClient();

  await supabase.from("feed_post_reports").update({ status: "afgehandeld" }).eq("id", reportId);

  if (decision === "deleted" && postId) {
    await supabase.from("feed_posts").delete().eq("id", postId);
  }

  // Communicatieplan: de melder krijgt terugkoppeling dat zijn rapportage
  // is behandeld — alleen in-app, zie notify_report_resolved (migratie 0079).
  await supabase.rpc("notify_report_resolved", { p_report_id: reportId, p_decision: decision });

  // Wie het heeft afgehandeld en welke actie is genomen staat nergens op de
  // rapportage-rij zelf — audit_logs is hier de enige plek waar dat
  // (behandeld door/wanneer/actie) uit valt te herleiden voor de UI.
  await logAuditAction("report_resolved", "feed_post_report", reportId, {
    decision: decision === "deleted" ? "Bericht verwijderd" : "Bericht behouden",
  });

  revalidatePath("/beheer/rapportages");
}
