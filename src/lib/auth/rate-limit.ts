import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";

const WINDOW_MINUTES = 15;
const MAX_ATTEMPTS = 3;

/**
 * Voorkomt dat iemand een e-mailadres kan bestoken met herhaalde inlog-/
 * resetlinks (magic link, wachtwoord-reset) door hetzelfde adres steeds
 * opnieuw in te vullen. Hergebruikt de bestaande `events`-tabel i.p.v. een
 * nieuwe rate-limit-tabel — deze aanvragen gebeuren altijd vóór een sessie
 * (anonieme context), dus via de admin-client: `events` heeft geen
 * insert-policy voor anon/authenticated, alleen de board-only select-policy.
 *
 * Geeft `true` terug als de limiet al bereikt is (dan niet versturen), en
 * registreert bij `false` meteen deze poging.
 */
export async function isEmailRateLimited(kind: string, email: string): Promise<boolean> {
  const admin = createAdminClient();
  const normalizedEmail = email.trim().toLowerCase();
  const since = new Date(Date.now() - WINDOW_MINUTES * 60 * 1000).toISOString();

  const { count } = await admin
    .from("events")
    .select("id", { count: "exact", head: true })
    .eq("event_type", kind)
    .gte("created_at", since)
    .contains("metadata", { email: normalizedEmail });

  if ((count ?? 0) >= MAX_ATTEMPTS) {
    return true;
  }

  await admin.from("events").insert({ event_type: kind, metadata: { email: normalizedEmail } });
  return false;
}
