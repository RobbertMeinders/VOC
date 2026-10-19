import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/types/database";

type Communication = Database["public"]["Tables"]["communications"]["Row"];

export type NewsletterRecipientPreview = { willReceive: number; excludedUnsubscribed: number };

// Telt, zonder iets te wijzigen, hoeveel mensen een klik op "Versturen" nu
// zou bereiken — dezelfde filters en dezelfde ontdubbeling op e-mailadres
// (leden gaan voor) als claim_newsletter_deliveries (0116), maar read-only,
// zodat de bevestiging in de editor een echt aantal kan tonen (N4/N5).
export async function previewNewsletterRecipients(
  supabase: SupabaseClient<Database>,
  communication: Pick<Communication, "id" | "recipient_filter">
): Promise<NewsletterRecipientPreview> {
  const [{ data: lists }, { data: extraProfiles }, { data: extraContacts }] = await Promise.all([
    supabase.from("communication_recipient_lists").select("list_id").eq("communication_id", communication.id),
    supabase.from("communication_recipient_profiles").select("profile_id").eq("communication_id", communication.id),
    supabase.from("communication_recipient_contacts").select("contact_id").eq("communication_id", communication.id),
  ]);
  const listIds = (lists ?? []).map((l) => l.list_id);
  const extraProfileIds = new Set((extraProfiles ?? []).map((p) => p.profile_id));
  const extraContactIds = new Set((extraContacts ?? []).map((c) => c.contact_id));

  let listProfileIds = new Set<string>();
  let listContactIds = new Set<string>();
  if (communication.recipient_filter === "lijsten" && listIds.length > 0) {
    const [{ data: lp }, { data: lc }] = await Promise.all([
      supabase.from("contact_list_profiles").select("profile_id").in("list_id", listIds),
      supabase.from("contact_list_contacts").select("contact_id").in("list_id", listIds),
    ]);
    listProfileIds = new Set((lp ?? []).map((r) => r.profile_id));
    listContactIds = new Set((lc ?? []).map((r) => r.contact_id));
  }

  const [{ data: profiles }, { data: contacts }, { data: existingDeliveries }] = await Promise.all([
    supabase.from("profiles").select("id, is_active, email, email_campaigns"),
    supabase.from("contacts").select("id, email, opted_out"),
    supabase.from("communication_deliveries").select("email, status").eq("communication_id", communication.id),
  ]);
  // Wie al een geslaagde verzending heeft (vorige poging), telt niet mee als
  // "zou nu ontvangen" — alleen nieuwe en nog-niet-gelukte ontvangers.
  const alreadySentEmails = new Set((existingDeliveries ?? []).filter((d) => d.status === "verstuurd").map((d) => d.email));

  // Leden eerst: bepaalt welk e-mailadres "bezet" is, zodat een contact met
  // hetzelfde adres (D3) niet nog eens meetelt — exact dezelfde volgorde als
  // claim_newsletter_deliveries.
  const seenEmails = new Set<string>();
  let willReceive = 0;
  let excludedUnsubscribed = 0;

  for (const profile of profiles ?? []) {
    if (!profile.is_active) continue;
    const matchesFilter =
      communication.recipient_filter === "alle_actieve_leden" ? true : listProfileIds.has(profile.id) || extraProfileIds.has(profile.id);
    if (!matchesFilter) continue;
    const email = profile.email.trim().toLowerCase();
    if (seenEmails.has(email)) continue;
    seenEmails.add(email);
    if (alreadySentEmails.has(email)) continue;
    if (!profile.email_campaigns) {
      excludedUnsubscribed++;
      continue;
    }
    willReceive++;
  }

  for (const contact of contacts ?? []) {
    const matchesFilter = listContactIds.has(contact.id) || extraContactIds.has(contact.id);
    if (!matchesFilter) continue;
    const email = contact.email.trim().toLowerCase();
    if (seenEmails.has(email)) continue; // al bezet door een lid met hetzelfde adres
    seenEmails.add(email);
    if (alreadySentEmails.has(email)) continue;
    if (contact.opted_out) {
      excludedUnsubscribed++;
      continue;
    }
    willReceive++;
  }

  return { willReceive, excludedUnsubscribed };
}
