import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/types/database";

// Voor de vijf betekenisvolle, nergens al getrackte gebeurtenissen
// (0042_events_and_statistics.sql) — nooit de aanroepende pagina/actie laten
// falen als loggen om wat voor reden dan ook mislukt, dus altijd zwijgend
// falen i.p.v. de fout door te laten.
export async function logEvent(
  eventType: string,
  targetType?: string,
  targetId?: string,
  metadata?: Record<string, unknown>
): Promise<void> {
  try {
    const supabase = await createClient();
    await supabase.rpc("log_event", {
      p_event_type: eventType,
      p_target_type: targetType ?? null,
      p_target_id: targetId ?? null,
      p_metadata: metadata ?? {},
    });
  } catch (cause) {
    console.error("[events] logEvent failed:", cause);
  }
}

// Voor het opruimen van dode pushabonnementen. Twee heel verschillende
// aanroepcontexten: een ingelogd lid dat zelf opzegt (gewone sessie-
// gebonden client, `log_push_unsubscribed` staat open voor `authenticated`)
// en de send-push-cron die dode 404/410-abonnementen opruimt — die heeft
// geen gebruikerssessie (0060_restrict_cron_only_rpcs_and_registration_
// update.sql trok de `anon`-toegang daarom in), dus die roept dit aan met
// een expliciet meegegeven service-role-client i.p.v. de standaard sessie-
// gebonden client.
export async function logPushUnsubscribed(
  endpoint: string,
  profileId?: string | null,
  client?: SupabaseClient<Database>
): Promise<void> {
  try {
    const supabase = client ?? (await createClient());
    await supabase.rpc("log_push_unsubscribed", { p_endpoint: endpoint, p_profile_id: profileId ?? null });
  } catch (cause) {
    console.error("[events] logPushUnsubscribed failed:", cause);
  }
}
