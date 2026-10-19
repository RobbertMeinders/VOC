import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/types/database";

type Communication = Database["public"]["Tables"]["communications"]["Row"];

export type NewsletterRecipientPreview = { willReceive: number; excludedUnsubscribed: number };

// Telt, zonder iets te wijzigen, hoeveel mensen een klik op "Versturen" nu
// zou bereiken — dezelfde filters als claim_newsletter_recipients/
// claim_newsletter_contact_recipients (0089), maar read-only, zodat de
// bevestiging in de editor een echt aantal kan tonen (N4) i.p.v. alleen
// "naar de gekozen doelgroep". Ontdubbelen tussen leden en contacten met
// hetzelfde adres hoort bij N5/D3 (een latere stap) en gebeurt hier dus nog
// niet — dit telt, net als de bestaande claim-RPC's vandaag, elke rij apart.
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

  const [{ data: profiles }, { data: contacts }, { data: sentProfileRows }, { data: sentContactRows }] = await Promise.all([
    supabase.from("profiles").select("id, is_active, email_campaigns"),
    supabase.from("contacts").select("id, opted_out"),
    supabase.from("notifications").select("profile_id").eq("communication_id", communication.id).not("emailed_at", "is", null),
    supabase.from("communication_contact_sends").select("contact_id").eq("communication_id", communication.id).not("emailed_at", "is", null),
  ]);
  const alreadySentProfileIds = new Set((sentProfileRows ?? []).map((r) => r.profile_id));
  const alreadySentContactIds = new Set((sentContactRows ?? []).map((r) => r.contact_id));

  let willReceive = 0;
  let excludedUnsubscribed = 0;

  for (const profile of profiles ?? []) {
    if (!profile.is_active) continue;
    const matchesFilter =
      communication.recipient_filter === "alle_actieve_leden" ? true : listProfileIds.has(profile.id) || extraProfileIds.has(profile.id);
    if (!matchesFilter) continue;
    if (alreadySentProfileIds.has(profile.id)) continue;
    if (!profile.email_campaigns) {
      excludedUnsubscribed++;
      continue;
    }
    willReceive++;
  }

  for (const contact of contacts ?? []) {
    const matchesFilter = listContactIds.has(contact.id) || extraContactIds.has(contact.id);
    if (!matchesFilter) continue;
    if (alreadySentContactIds.has(contact.id)) continue;
    if (contact.opted_out) {
      excludedUnsubscribed++;
      continue;
    }
    willReceive++;
  }

  return { willReceive, excludedUnsubscribed };
}
