import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { performNewsletterSend } from "@/lib/newsletter/send";

// Zelfde maxDuration-overweging als /beheer/communicatie/[id] (performNewsletterSend
// loopt sequentieel over elke ontvanger, en deze cron kan in één run meerdere
// ingeplande campagnes tegelijk oppakken).
export const maxDuration = 300;

// Mirror van de andere cron-routes: CRON_SECRET-auth, service-role-client
// omdat hier geen bestuurslid-sessie is (zie 0069_newsletter_scheduling.sql
// voor waarom claim/mark/finalize nu ook auth.role() = 'service_role'
// toestaan naast is_board()).
export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (!process.env.CRON_SECRET || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createAdminClient();
  const nowIso = new Date().toISOString();
  const { data: due, error } = await supabase
    .from("communications")
    .select("*")
    .eq("status", "ingepland")
    .lte("scheduled_at", nowIso);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const results: { id: string; total: number; sent: number }[] = [];
  for (const communication of due ?? []) {
    try {
      const result = await performNewsletterSend(supabase, communication);
      results.push({ id: communication.id, ...result });
    } catch (cause) {
      console.error("[cron] send-scheduled-campaigns failed for", communication.id, cause);
    }
  }

  return NextResponse.json({ processed: results.length, results });
}
