import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";

const WINDOW_MINUTES = 15;
const MAX_ATTEMPTS = 5;

function sinceTimestamp(): string {
  return new Date(Date.now() - WINDOW_MINUTES * 60 * 1000).toISOString();
}

async function countRecentAttempts(kind: string, normalizedEmail: string): Promise<number> {
  const admin = createAdminClient();
  const { count } = await admin
    .from("events")
    .select("id", { count: "exact", head: true })
    .eq("event_type", kind)
    .gte("created_at", sinceTimestamp())
    .contains("metadata", { email: normalizedEmail });
  return count ?? 0;
}

async function recordAttempt(kind: string, normalizedEmail: string): Promise<void> {
  const admin = createAdminClient();
  await admin.from("events").insert({ event_type: kind, metadata: { email: normalizedEmail } });
}

/**
 * Voorkomt dat iemand een e-mailadres kan bestoken met herhaalde inlog-/
 * resetlinks (magic link, wachtwoord-reset) door hetzelfde adres steeds
 * opnieuw in te vullen. Hergebruikt de bestaande `events`-tabel i.p.v. een
 * nieuwe rate-limit-tabel — deze aanvragen gebeuren altijd vóór een sessie
 * (anonieme context), dus via de admin-client: `events` heeft geen
 * insert-policy voor anon/authenticated, alleen de board-only select-policy.
 *
 * Geeft `true` terug als de limiet al bereikt is (dan niet versturen), en
 * registreert bij `false` meteen deze poging. Voor deze twee aanroepen
 * (magic link, wachtwoord-reset) is er geen zinvol onderscheid tussen
 * "gelukt"/"mislukt" op het moment van aanvragen — élke aanvraag telt mee,
 * want het doel is spam naar iemands inbox voorkomen, niet brute-force.
 */
export async function isEmailRateLimited(kind: string, email: string): Promise<boolean> {
  // Faalt bewust "open" (niet-gelimiteerd) bij een onverwachte fout hier —
  // sinds signInAction dit ook gebruikt (naast de al langer bestaande
  // magic-link/wachtwoord-reset-aanroepen) zou een storing in deze
  // rate-limiter anders het HELE inloggen kunnen platleggen, wat een veel
  // groter probleem is dan tijdelijk geen rate limiting. De fout wordt wel
  // gelogd zodat een structureel probleem (bv. een ontbrekende
  // SUPABASE_SERVICE_ROLE_KEY) niet onopgemerkt blijft.
  try {
    const normalizedEmail = email.trim().toLowerCase();
    if ((await countRecentAttempts(kind, normalizedEmail)) >= MAX_ATTEMPTS) {
      return true;
    }
    await recordAttempt(kind, normalizedEmail);
    return false;
  } catch (cause) {
    console.error(`[rate-limit] isEmailRateLimited('${kind}') failed, failing open:`, cause);
    return false;
  }
}

const PASSWORD_LOGIN_KIND = "password_login_attempted";

/**
 * Variant specifiek voor wachtwoord-login: telt alléén mislukte pogingen
 * (zie recordFailedPasswordLoginAttempt hieronder), niet elke poging zoals
 * isEmailRateLimited hierboven — anders liep een account dat gewoon
 * herhaaldelijk succesvol inlogt (bv. op meerdere apparaten) na een paar
 * keer alsnog tegen de limiet aan, puur omdat "poging" en "mislukte poging"
 * door elkaar werden geteld. Check en registratie zijn daarom losgetrokken:
 * deze controleert alleen, signInAction registreert pas ná een mislukte
 * supabase.auth.signInWithPassword-aanroep.
 */
export async function isPasswordLoginRateLimited(email: string): Promise<boolean> {
  try {
    const normalizedEmail = email.trim().toLowerCase();
    return (await countRecentAttempts(PASSWORD_LOGIN_KIND, normalizedEmail)) >= MAX_ATTEMPTS;
  } catch (cause) {
    console.error("[rate-limit] isPasswordLoginRateLimited failed, failing open:", cause);
    return false;
  }
}

export async function recordFailedPasswordLoginAttempt(email: string): Promise<void> {
  try {
    await recordAttempt(PASSWORD_LOGIN_KIND, email.trim().toLowerCase());
  } catch (cause) {
    console.error("[rate-limit] recordFailedPasswordLoginAttempt failed:", cause);
  }
}
