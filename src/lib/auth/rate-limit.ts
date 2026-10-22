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

/**
 * IP-variant van isEmailRateLimited hierboven, voor anonieme formulieren
 * waar het e-mailadres zelf niet geverifieerd is (bv. de publieke
 * activiteit-aanmelding) — alleen op e-mailadres limiteren laat een
 * aanvaller dan nog steeds onbeperkt doorgaan door telkens een ander
 * (verzonnen) adres te gebruiken. Zelfde events-tabel/patroon, nu op
 * metadata->>'ip' i.p.v. 'email'. Bewust een EIGEN kind-event-type i.p.v.
 * hetzelfde event als de e-mail-check hergebruiken, zodat de twee limieten
 * onafhankelijk van elkaar tellen (anders zou één poging meteen tegen
 * allebei de tellers meetellen, wat de effectieve limiet onbedoeld zou
 * halveren).
 */
async function countRecentIpAttempts(kind: string, ip: string): Promise<number> {
  const admin = createAdminClient();
  const { count } = await admin
    .from("events")
    .select("id", { count: "exact", head: true })
    .eq("event_type", kind)
    .gte("created_at", sinceTimestamp())
    .contains("metadata", { ip });
  return count ?? 0;
}

async function recordIpAttempt(kind: string, ip: string): Promise<void> {
  const admin = createAdminClient();
  await admin.from("events").insert({ event_type: kind, metadata: { ip } });
}

export async function isIpRateLimited(kind: string, ip: string | null): Promise<boolean> {
  // Geen bruikbaar adres (bv. lokale ontwikkelomgeving zonder proxy-header)
  // -- dan valt alleen de e-mail-variant terug, niet blokkeren op een lege
  // sleutel die toch alle aanvragen zou matchen.
  if (!ip) return false;
  try {
    const kindIp = `${kind}_ip`;
    if ((await countRecentIpAttempts(kindIp, ip)) >= MAX_ATTEMPTS) {
      return true;
    }
    await recordIpAttempt(kindIp, ip);
    return false;
  } catch (cause) {
    console.error(`[rate-limit] isIpRateLimited('${kind}') failed, failing open:`, cause);
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

const CONTACT_MESSAGE_KIND = "member_contact_message_sent";
const CONTACT_WINDOW_MINUTES = 60;
const CONTACT_MAX_MESSAGES = 5;

async function countRecentContactMessages(senderId: string): Promise<number> {
  const admin = createAdminClient();
  const since = new Date(Date.now() - CONTACT_WINDOW_MINUTES * 60 * 1000).toISOString();
  const { count } = await admin
    .from("events")
    .select("id", { count: "exact", head: true })
    .eq("event_type", CONTACT_MESSAGE_KIND)
    .eq("profile_id", senderId)
    .gte("created_at", since);
  return count ?? 0;
}

/**
 * Begrenst het "Neem contact op"-formulier op een ledenprofiel: een
 * ingelogd lid is hier de afzender (niet een los e-mailadres), dus deze
 * telt per profile_id i.p.v. per metadata.email zoals isEmailRateLimited
 * hierboven — dat is ook een echte kolom op events, geen jsonb-containment
 * nodig. Faalt bewust "open" bij een onverwachte fout, zelfde reden als
 * isEmailRateLimited: een storing hier mag de knop niet voor iedereen
 * platleggen.
 */
export async function isContactMessageRateLimited(senderId: string): Promise<boolean> {
  try {
    return (await countRecentContactMessages(senderId)) >= CONTACT_MAX_MESSAGES;
  } catch (cause) {
    console.error("[rate-limit] isContactMessageRateLimited failed, failing open:", cause);
    return false;
  }
}

export async function recordContactMessageSent(senderId: string, recipientId: string): Promise<void> {
  try {
    const admin = createAdminClient();
    await admin
      .from("events")
      .insert({ event_type: CONTACT_MESSAGE_KIND, profile_id: senderId, target_type: "profile", target_id: recipientId });
  } catch (cause) {
    console.error("[rate-limit] recordContactMessageSent failed:", cause);
  }
}
