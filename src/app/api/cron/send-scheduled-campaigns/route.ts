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

  // Portaal-gezondheid Blok C: begrenst elke aanroep tot 200 verstuurde
  // e-mails, zodat een grote ledenlijst deze functie niet op het
  // maxDuration-limiet (hierboven) laat vastlopen — performNewsletterSend
  // laat de rest dan gewoon op 'wachten' staan voor een volgende cron-tick
  // i.p.v. het platform de hele aanroep hard te laten afbreken.
  const MAX_RECIPIENTS_PER_RUN = 200;

  const results: { id: string; total: number; sent: number; hasMore?: boolean }[] = [];
  for (const communication of due ?? []) {
    try {
      const result = await performNewsletterSend(supabase, communication, "eerste_verzending", MAX_RECIPIENTS_PER_RUN);
      results.push({ id: communication.id, total: result.total, sent: result.sent, hasMore: result.hasMore });
      if (result.hasMore) {
        console.log(`[cron] send-scheduled-campaigns: ${communication.id} nog niet klaar, volgende tick pakt de rest op`);
      }
    } catch (cause) {
      console.error("[cron] send-scheduled-campaigns failed for", communication.id, cause);
    }
  }

  return NextResponse.json({ processed: results.length, results });
}
