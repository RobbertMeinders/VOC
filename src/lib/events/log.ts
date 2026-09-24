import "server-only";

import { createClient } from "@/lib/supabase/server";

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

// Voor het opruimen van dode pushabonnementen, waar geen ingelogde sessie
// (auth.uid()) beschikbaar is — zie log_push_unsubscribed.
export async function logPushUnsubscribed(endpoint: string, profileId?: string | null): Promise<void> {
  try {
    const supabase = await createClient();
    await supabase.rpc("log_push_unsubscribed", { p_endpoint: endpoint, p_profile_id: profileId ?? null });
  } catch (cause) {
    console.error("[events] logPushUnsubscribed failed:", cause);
  }
}
