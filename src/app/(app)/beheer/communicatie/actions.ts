"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireBoard } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { uploadImage } from "@/lib/supabase/upload";
import { logAuditAction } from "@/lib/audit/log";
import { sendRawHtmlEmail } from "@/lib/email/send";
import { renderNewsletterHtml, renderFooterUnsubscribeLine, UNSUBSCRIBE_LINE_TOKEN } from "@/lib/newsletter/render";
import { buildEventSnapshot } from "@/lib/newsletter/eventSnapshot";
import { performNewsletterSend } from "@/lib/newsletter/send";
import { getAppSettings } from "@/lib/settings/app-settings";
import type { NewsletterBlock, NewsletterEventBlock } from "@/lib/newsletter/types";

// next/navigation's redirect() throws internally to unwind the render; that
// throw must always be allowed through, never caught as a "real" error.
function isNextRedirectError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "digest" in error &&
    typeof (error as { digest?: unknown }).digest === "string" &&
    (error as { digest: string }).digest.startsWith("NEXT_REDIRECT")
  );
}

export async function createCommunicationAction(): Promise<void> {
  const profile = await requireBoard();
  const supabase = await createClient();

  try {
    const { data: communication, error } = await supabase
      .from("communications")
      .insert({
        subject: "Nieuwe nieuwsbrief",
        sender_name: "Veendammer Ondernemers Compagnie",
        created_by: profile.id,
      })
      .select("id")
      .single();

    if (error || !communication) {
      console.error("[communicatie] createCommunicationAction failed:", error);
      return;
    }

    await logAuditAction("communication_created", "communication", communication.id);

    revalidatePath("/beheer/communicatie");
    redirect(`/beheer/communicatie/${communication.id}`);
  } catch (cause) {
    if (isNextRedirectError(cause)) throw cause;
    console.error("[communicatie] createCommunicationAction threw:", cause);
  }
}

export async function deleteCommunicationAction(communicationId: string): Promise<void> {
  await requireBoard();
  const supabase = await createClient();

  const { data: communication } = await supabase
    .from("communications")
    .select("subject, status")
    .eq("id", communicationId)
    .maybeSingle();

  // Een verzonden campagne is de historie van wat daadwerkelijk naar leden
  // is gegaan — die blijft staan, ook als een bestuurslid 'm liever kwijt
  // zou willen. Alleen concepten (incl. een mislukte verzendpoging) mogen weg.
  if (communication?.status === "verzonden") {
    return;
  }

  await supabase.from("communications").delete().eq("id", communicationId);
  await logAuditAction("communication_deleted", "communication", communicationId, {
    subject: communication?.subject ?? null,
  });

  revalidatePath("/beheer/communicatie");
}

export type CommunicationFormState = { error?: string; success?: boolean };

export async function updateCommunicationAction(
  communicationId: string,
  _prevState: CommunicationFormState,
  formData: FormData
): Promise<CommunicationFormState> {
  await requireBoard();

  const subject = String(formData.get("subject") ?? "").trim();
  const preheader = String(formData.get("preheader") ?? "").trim();
  const senderName = String(formData.get("sender_name") ?? "").trim();
  const contentRaw = String(formData.get("content") ?? "[]");
  const showHeader = formData.get("show_header") !== "false";
  const showFooter = formData.get("show_footer") !== "false";

  if (!subject) {
    return { error: "Onderwerp is verplicht." };
  }

  let content: unknown;
  try {
    content = JSON.parse(contentRaw);
  } catch {
    return { error: "Er ging iets mis bij het opslaan van de inhoud. Probeer het opnieuw." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("communications")
    .update({
      subject,
      preheader: preheader || null,
      sender_name: senderName || null,
      content,
      show_header: showHeader,
      show_footer: showFooter,
    })
    .eq("id", communicationId);

  if (error) {
    return { error: "Opslaan is niet gelukt. Probeer het opnieuw." };
  }

  revalidatePath(`/beheer/communicatie/${communicationId}`);
  revalidatePath("/beheer/communicatie");
  return { success: true };
}

export type EventSnapshotState = { block?: NewsletterEventBlock; error?: string };

// Gebruikt zowel om een Evenement-blok voor het eerst te vullen (vanuit de
// activiteiten-kiezer in de editor) als om een bestaand blok te verversen
// (existingBlockId behoudt dan hetzelfde blok-id, zodat React het niet als
// een nieuw blok behandelt).
export async function getEventSnapshotAction(
  activityId: string,
  existingBlockId?: string,
  currentButtonLabel?: string
): Promise<EventSnapshotState> {
  await requireBoard();
  const supabase = await createClient();

  const { data: activity } = await supabase.from("activities").select("*").eq("id", activityId).maybeSingle();
  if (!activity) {
    return { error: "Deze activiteit bestaat niet (meer)." };
  }

  const block = await buildEventSnapshot(supabase, activity, existingBlockId, currentButtonLabel);
  return { block };
}

// "Communiceer over dit evenement"-knop op de activiteitpagina: maakt een
// nieuwe conceptnieuwsbrief aan met één Evenement-blok, al gevuld met de
// huidige gegevens van deze activiteit.
export async function createCommunicationFromActivityAction(activityId: string): Promise<void> {
  const profile = await requireBoard();
  const supabase = await createClient();

  try {
    const { data: activity } = await supabase.from("activities").select("*").eq("id", activityId).maybeSingle();
    if (!activity) {
      console.error("[communicatie] createCommunicationFromActivityAction: activiteit niet gevonden", activityId);
      return;
    }

    const eventBlock = await buildEventSnapshot(supabase, activity);

    const { data: communication, error } = await supabase
      .from("communications")
      .insert({
        subject: activity.title,
        sender_name: "Veendammer Ondernemers Compagnie",
        content: [eventBlock],
        linked_activity_id: activity.id,
        created_by: profile.id,
      })
      .select("id")
      .single();

    if (error || !communication) {
      console.error("[communicatie] createCommunicationFromActivityAction failed:", error);
      return;
    }

    await logAuditAction("communication_created", "communication", communication.id, {
      fromActivity: activity.id,
    });

    revalidatePath("/beheer/communicatie");
    redirect(`/beheer/communicatie/${communication.id}`);
  } catch (cause) {
    if (isNextRedirectError(cause)) throw cause;
    console.error("[communicatie] createCommunicationFromActivityAction threw:", cause);
  }
}

export type AudienceState = { error?: string; success?: boolean };

// Vervang-alles-semantiek i.p.v. een diff berekenen: eenvoudiger, en de
// doelgroep van één campagne is klein genoeg (lijsten + losse extra's) dat
// dat geen probleem is. Blijft bewust altijd aanroepbaar, ook als de
// campagne al (deels) verstuurd is — zie 0089_newsletter_audience_targeting
// en de "extra versturen"-sectie in NewsletterEditor: wie al een
// notifications-/communication_contact_sends-rij heeft, krijgt 'm bij de
// eerstvolgende "Versturen"-klik hoe dan ook niet dubbel (unique constraint
// + claim-RPC's slaan al-geclaimde ontvangers over).
export async function updateCommunicationAudienceAction(
  communicationId: string,
  recipientFilter: "alle_actieve_leden" | "lijsten",
  listIds: string[],
  extraProfileIds: string[],
  extraContactIds: string[]
): Promise<AudienceState> {
  await requireBoard();
  const supabase = await createClient();

  const { error: updateError } = await supabase
    .from("communications")
    .update({ recipient_filter: recipientFilter })
    .eq("id", communicationId);
  if (updateError) {
    return { error: "Doelgroep opslaan is niet gelukt." };
  }

  await Promise.all([
    supabase.from("communication_recipient_lists").delete().eq("communication_id", communicationId),
    supabase.from("communication_recipient_profiles").delete().eq("communication_id", communicationId),
    supabase.from("communication_recipient_contacts").delete().eq("communication_id", communicationId),
  ]);

  await Promise.all([
    listIds.length > 0
      ? supabase.from("communication_recipient_lists").insert(listIds.map((listId) => ({ communication_id: communicationId, list_id: listId })))
      : Promise.resolve(),
    extraProfileIds.length > 0
      ? supabase
          .from("communication_recipient_profiles")
          .insert(extraProfileIds.map((profileId) => ({ communication_id: communicationId, profile_id: profileId })))
      : Promise.resolve(),
    extraContactIds.length > 0
      ? supabase
          .from("communication_recipient_contacts")
          .insert(extraContactIds.map((contactId) => ({ communication_id: communicationId, contact_id: contactId })))
      : Promise.resolve(),
  ]);

  revalidatePath(`/beheer/communicatie/${communicationId}`);
  return { success: true };
}

export type DuplicateCommunicationState = { error?: string; id?: string };

// Kopieert alleen de bewerkbare inhoud (onderwerp/pre-header/afzender/
// content/kop-voettekst-schakelaars) — nooit de verzendstatus, ontvangers-
// aantal of doelgroepselectie van het origineel, want een duplicaat is
// altijd een nieuw, nog nooit verstuurd concept. Geeft het nieuwe id terug
// i.p.v. zelf te redirecten: dit wordt direct vanuit het "..."-menu op de
// lijstpagina aangeroepen (geen <form>, zie CommunicationRow), en een
// redirect() in een server action vereist een form-submissie om de
// navigatie op de client correct te laten landen.
export async function duplicateCommunicationAction(communicationId: string): Promise<DuplicateCommunicationState> {
  const profile = await requireBoard();
  const supabase = await createClient();

  const { data: source } = await supabase
    .from("communications")
    .select("subject, preheader, sender_name, content, show_header, show_footer, linked_activity_id")
    .eq("id", communicationId)
    .maybeSingle();
  if (!source) {
    return { error: "Origineel niet gevonden." };
  }

  const { data: duplicate, error } = await supabase
    .from("communications")
    .insert({
      subject: `Kopie van ${source.subject}`,
      preheader: source.preheader,
      sender_name: source.sender_name,
      content: source.content,
      show_header: source.show_header,
      show_footer: source.show_footer,
      linked_activity_id: source.linked_activity_id,
      created_by: profile.id,
    })
    .select("id")
    .single();

  if (error || !duplicate) {
    return { error: "Dupliceren is niet gelukt. Probeer het opnieuw." };
  }

  await logAuditAction("communication_duplicated", "communication", duplicate.id, { sourceId: communicationId });

  revalidatePath("/beheer/communicatie");
  return { id: duplicate.id };
}

export type TestSendState = { error?: string; success?: boolean };

// Testmail: rendert de huidige (mogelijk nog niet opgeslagen) staat van de
// editor en stuurt 'm alleen naar het eigen e-mailadres van het bestuurslid
// dat op de knop klikt — nooit naar leden, en zonder notifications/stats-
// rijen aan te maken (dat gebeurt alleen bij de écht definitieve verzending,
// zie sendNewsletterAction verderop in dit bestand).
export async function sendTestNewsletterAction(
  subject: string,
  preheader: string,
  senderName: string,
  content: NewsletterBlock[],
  showHeader: boolean,
  showFooter: boolean
): Promise<TestSendState> {
  const profile = await requireBoard();

  if (!subject.trim()) {
    return { error: "Onderwerp is verplicht." };
  }

  const settings = await getAppSettings();
  const html = renderNewsletterHtml(content, {
    subject,
    preheader: preheader || null,
    showHeader,
    showFooter,
    siteUrl: process.env.SITE_URL,
    orgName: settings.org_name,
    logoUrl: settings.logo_url,
  }).replace(UNSUBSCRIBE_LINE_TOKEN, renderFooterUnsubscribeLine({ variant: "preview", orgName: settings.org_name }));
  const result = await sendRawHtmlEmail(profile.email, `[TEST] ${subject}`, html, senderName || null);

  if (result.error) {
    return { error: result.error };
  }

  return { success: true };
}

export type UploadImageState = { error?: string; url?: string };

// Upload naar de publieke email-assets-bucket (zelfde als de bestaande
// e-mailtemplate-afbeeldingen) — een nieuwsbriefafbeelding moet een URL
// hebben die niet verloopt en zonder sessie leesbaar is, in tegenstelling
// tot de signed URLs die de rest van de app voor privé-buckets gebruikt.
export async function uploadNewsletterImageAction(
  _prevState: UploadImageState,
  formData: FormData
): Promise<UploadImageState> {
  await requireBoard();

  const file = formData.get("image");
  if (!(file instanceof File) || file.size === 0) {
    return { error: "Kies een afbeelding." };
  }

  const supabase = await createClient();
  const result = await uploadImage(supabase, "email-assets", "nieuwsbrieven", file);
  if ("error" in result) {
    return { error: result.error };
  }

  const { data } = supabase.storage.from("email-assets").getPublicUrl(result.path);
  return { url: data.publicUrl };
}

export type SendNewsletterState = { error?: string; total?: number; sent?: number; failed?: number; done?: boolean };

// De daadwerkelijke verzending (fase 8, "Verzendarchitectuur" sectie J).
// Kernregel: nooit een halve verzending als succesvol rapporteren. Elke
// ontvanger krijgt zijn eigen notifications-rij (claim_newsletter_recipients,
// 0067_newsletter_send.sql) die hier, direct na de individuele
// verzend-aanroep, pas als verstuurd wordt gemarkeerd — nooit vooraf, nooit
// in bulk. Breekt deze functie halverwege af (bv. door een functie-timeout
// bij een groot ledenaantal), dan staat alles wat al écht verstuurd is ook
// al als zodanig vastgelegd; nogmaals op "Versturen" klikken (of "Opnieuw
// proberen" na een gedeeltelijke mislukking) berekent via dezelfde
// claim-aanroep vanzelf opnieuw wie nog een lege emailed_at heeft en
// verstuurt alléén aan hen — nooit een dubbele e-mail aan wie al iets
// ontving.
export async function sendNewsletterAction(communicationId: string): Promise<SendNewsletterState> {
  await requireBoard();
  const supabase = await createClient();

  const { data: communication } = await supabase.from("communications").select("*").eq("id", communicationId).maybeSingle();
  if (!communication) {
    return { error: "Nieuwsbrief niet gevonden." };
  }
  // Geen blanco weigering meer bij status 'verzonden' (N3/D6): dat blokkeerde
  // "nasturen" naar een later toegevoegde ontvanger. claim_newsletter_send
  // (0113) staat 'verzonden' nu ook toe als startstatus, en de claim-RPC's
  // slaan iedereen die al een geslaagde verzending heeft toch al over —
  // zie performNewsletterSend voor de volledige uitleg van dat patroon.
  if (!communication.subject.trim()) {
    return { error: "Onderwerp is verplicht voor je kunt versturen." };
  }
  const content = Array.isArray(communication.content) ? (communication.content as unknown as NewsletterBlock[]) : [];
  if (content.length === 0) {
    return { error: "Voeg eerst inhoud toe voor je kunt versturen." };
  }

  let total: number;
  let sent: number;
  try {
    const result = await performNewsletterSend(supabase, communication);
    if (result.alreadySending) {
      return { error: "Deze nieuwsbrief wordt al verstuurd (mogelijk net via de ingeplande verzending). Probeer het straks opnieuw." };
    }
    ({ total, sent } = result);
  } catch (cause) {
    // performNewsletterSend gooit een specifieke boodschap als het
    // markeren-als-verstuurd blijft mislukken (N4) — die is belangrijker om
    // te laten zien dan de generieke terugval, want hij betekent dat een
    // deel al écht verstuurd is terwijl de boekhouding mogelijk achterloopt.
    const message = cause instanceof Error ? cause.message : null;
    return { error: message || "Ontvangerslijst ophalen is niet gelukt. Probeer het opnieuw." };
  }

  if (sent > 0) {
    await logAuditAction("communication_sent", "communication", communicationId, { total, sent, subject: communication.subject });
  }

  revalidatePath(`/beheer/communicatie/${communicationId}`);
  revalidatePath("/beheer/communicatie");
  revalidatePath("/beheer/statistieken");

  return { total, sent, failed: total - sent, done: total > 0 && sent >= total };
}

export type ScheduleNewsletterState = { error?: string; success?: boolean };

// "Inplannen" zet alleen status + scheduled_at — de daadwerkelijke
// verzending gebeurt later door /api/cron/send-scheduled-campaigns (dezelfde
// performNewsletterSend als hierboven). Content blijft tot dat moment
// gewoon bewerkbaar zolang de status 'concept' is; zodra ingepland geldt
// dezelfde alleen-lezen-grendel als bij een echte verzending (readOnly in
// NewsletterEditor kijkt naar status !== "concept"), zodat de cron nooit een
// halverwege-bewerkte versie oppakt.
export async function scheduleNewsletterAction(communicationId: string, scheduledAtIso: string): Promise<ScheduleNewsletterState> {
  await requireBoard();

  const scheduledAt = new Date(scheduledAtIso);
  if (Number.isNaN(scheduledAt.getTime()) || scheduledAt.getTime() <= Date.now()) {
    return { error: "Kies een moment in de toekomst." };
  }

  const supabase = await createClient();
  const { data: communication } = await supabase
    .from("communications")
    .select("status, subject, content")
    .eq("id", communicationId)
    .maybeSingle();
  if (!communication) {
    return { error: "Nieuwsbrief niet gevonden." };
  }
  if (communication.status !== "concept") {
    return { error: "Alleen een concept kan ingepland worden." };
  }
  if (!communication.subject.trim()) {
    return { error: "Onderwerp is verplicht voor je kunt inplannen." };
  }
  const content = Array.isArray(communication.content) ? (communication.content as unknown as NewsletterBlock[]) : [];
  if (content.length === 0) {
    return { error: "Voeg eerst inhoud toe voor je kunt inplannen." };
  }

  const { error } = await supabase
    .from("communications")
    .update({ status: "ingepland", scheduled_at: scheduledAt.toISOString() })
    .eq("id", communicationId);
  if (error) {
    return { error: "Inplannen is niet gelukt. Probeer het opnieuw." };
  }

  await logAuditAction("communication_scheduled", "communication", communicationId, {
    subject: communication.subject,
    scheduledAt: scheduledAt.toISOString(),
  });

  revalidatePath(`/beheer/communicatie/${communicationId}`);
  revalidatePath("/beheer/communicatie");
  return { success: true };
}

export async function cancelScheduleAction(communicationId: string): Promise<ScheduleNewsletterState> {
  await requireBoard();
  const supabase = await createClient();

  const { data: communication } = await supabase.from("communications").select("status, subject").eq("id", communicationId).maybeSingle();
  if (!communication) {
    return { error: "Nieuwsbrief niet gevonden." };
  }
  if (communication.status !== "ingepland") {
    return { error: "Deze nieuwsbrief is niet ingepland." };
  }

  const { error } = await supabase
    .from("communications")
    .update({ status: "concept", scheduled_at: null })
    .eq("id", communicationId);
  if (error) {
    return { error: "Annuleren is niet gelukt. Probeer het opnieuw." };
  }

  await logAuditAction("communication_schedule_cancelled", "communication", communicationId, { subject: communication.subject });

  revalidatePath(`/beheer/communicatie/${communicationId}`);
  revalidatePath("/beheer/communicatie");
  return { success: true };
}
