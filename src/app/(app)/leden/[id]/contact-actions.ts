"use server";

import { requireProfile } from "@/lib/auth/session";
import { createAdminClient } from "@/lib/supabase/admin";
import { isEmailConfigured, sendMemberContactEmail } from "@/lib/email/send";
import { isContactMessageRateLimited, recordContactMessageSent } from "@/lib/auth/rate-limit";

export type SendContactMessageState = { error?: string; success?: boolean };

const MAX_SUBJECT_LENGTH = 150;
const MAX_MESSAGE_LENGTH = 4000;

// VOC Hub — Veilige e-mailcontactfunctie. Bewust GEEN chat/inbox/
// berichtencentrum: dit stuurt één keer een e-mail en onthoudt daarna niets
// van de inhoud (alleen dat er een poging was, voor de rate limit
// hieronder) — geen conversatiegeschiedenis, geen read-status, niets om
// achteraf terug te lezen in de app zelf.
//
// De ontvanger komt altijd uit een geldig profiel-id (nooit een vrij
// invoerbaar adres), en het e-mailadres van de ontvanger wordt nergens in
// deze functie teruggegeven aan de aanroeper — alleen gebruikt om de mail
// te versturen. profiles.email is niet rechtstreeks selecteerbaar voor
// authenticated (0062_lock_down_profiles_contact_columns.sql) en de normale
// maskering (get_member_profile) verbergt het adres juist zodra de
// ontvanger show_email uit heeft — deze knop moet wél werken ongeacht die
// voorkeur, zonder het adres ooit aan de afzender te laten zien. Vandaar de
// service-role-client, uitsluitend hier en uitsluitend om te versturen.
export async function sendMemberContactMessageAction(
  recipientId: string,
  subject: string,
  message: string
): Promise<SendContactMessageState> {
  const sender = await requireProfile();

  if (recipientId === sender.id) {
    return { error: "Je kunt geen bericht naar jezelf sturen." };
  }

  const trimmedSubject = subject.trim();
  const trimmedMessage = message.trim();
  if (!trimmedSubject || !trimmedMessage) {
    return { error: "Vul een onderwerp en bericht in." };
  }
  if (trimmedSubject.length > MAX_SUBJECT_LENGTH) {
    return { error: "Onderwerp is te lang." };
  }
  if (trimmedMessage.length > MAX_MESSAGE_LENGTH) {
    return { error: "Bericht is te lang." };
  }

  if (!isEmailConfigured()) {
    return { error: "E-mail versturen is niet geconfigureerd. Neem contact op met het bestuur." };
  }

  if (await isContactMessageRateLimited(sender.id)) {
    return { error: "Je hebt de afgelopen tijd al meerdere berichten verstuurd. Probeer het later opnieuw." };
  }

  const admin = createAdminClient();
  const { data: recipient } = await admin
    .from("profiles")
    .select("email, first_name, last_name, is_active")
    .eq("id", recipientId)
    .maybeSingle();

  if (!recipient || !recipient.is_active || !recipient.email) {
    return { error: "Dit lid kan momenteel niet worden bereikt." };
  }

  // M1: het reply-to-adres komt uit auth.users (de echte identiteit waarmee
  // het account ook daadwerkelijk kan inloggen), niet uit profiles.email —
  // die kolom volgt auth.users via een aparte sync-trigger (0112) en is zelf
  // geen bron van waarheid.
  const { data: senderAuthUser } = await admin.auth.admin.getUserById(sender.id);
  const senderEmail = senderAuthUser?.user?.email;
  if (!senderEmail) {
    return { error: "Je eigen e-mailadres is niet bekend. Neem contact op met het bestuur." };
  }

  const senderName = `${sender.first_name} ${sender.last_name}`;
  const result = await sendMemberContactEmail({
    to: recipient.email,
    replyTo: senderEmail,
    senderName,
    subject: trimmedSubject,
    message: trimmedMessage,
  });

  if (result.error) {
    return { error: "Versturen is niet gelukt. Probeer het later opnieuw." };
  }

  await recordContactMessageSent(sender.id, recipientId);

  return { success: true };
}
