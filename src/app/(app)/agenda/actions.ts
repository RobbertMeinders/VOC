"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireBoard, requireProfile } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { removePreviousImage, uploadImage } from "@/lib/supabase/upload";
import { uploadDocument } from "@/lib/supabase/uploadDocument";
import { invalidateQuery } from "@/lib/cache/queryCache";
import { logAuditAction } from "@/lib/audit/log";
import { sendRawHtmlEmail, escapeHtml } from "@/lib/email/send";

export type ActionResult = { error?: string };

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

// Never let a malformed date string reach .toISOString() and throw — that
// crashed the whole Server Action (React error #441) instead of showing a
// form error. Empty input, or input that doesn't parse, both become null.
function parseIsoOrNull(value: string): string | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function slugify(title: string): string {
  const base = title
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
  return base || "activiteit";
}

// Genereert eenmalig, bij het aanmaken, een leesbare permalink-slug (bv.
// "open-borrel") — gebruikt door de "Delen"-knop op de openbare
// agenda-embed (zie ShareActivityButton + /embed/agenda's
// ?activiteit=<slug>-lookup). Wordt daarna nooit meer herberekend bij het
// bewerken, ook niet als de titel wijzigt: anders zou een al gedeelde link
// stukgaan.
async function generateUniqueSlug(supabase: Awaited<ReturnType<typeof createClient>>, title: string): Promise<string> {
  const base = slugify(title);
  let slug = base;
  let attempt = 2;
  for (;;) {
    const { data } = await supabase.from("activities").select("id").eq("slug", slug).maybeSingle();
    if (!data) return slug;
    slug = `${base}-${attempt++}`;
  }
}

export type RegisterResult = ActionResult & { waitlisted?: boolean };

export async function registerForActivityAction(activityId: string): Promise<RegisterResult> {
  const profile = await requireProfile();
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("activity_registrations")
    .insert({ activity_id: activityId, profile_id: profile.id })
    .select("is_waitlisted")
    .single();

  if (error) {
    // The enforce_activity_registration_rules trigger raises a friendly Dutch
    // message for the deadline case; a unique-violation means the member is
    // already registered (e.g. a second tab). Everything else falls back to
    // a generic message — error.message zelf nooit tonen, dat kan een ruwe
    // technische (en mogelijk Engelse) databasefout zijn.
    if (error.code === "23505") {
      return { error: "Je bent al aangemeld." };
    }
    if (error.message?.includes("aanmelddeadline")) {
      return { error: error.message };
    }
    return { error: "Aanmelden is niet gelukt. Probeer het opnieuw." };
  }

  // Anders bleef Statistieken > Activiteiten tot 60s (de cache-TTL) een
  // aanmeldingenaantal van vóór deze aanmelding tonen.
  invalidateQuery("statistieken-activiteiten");
  revalidatePath(`/agenda/${activityId}`);
  revalidatePath("/agenda");
  return { waitlisted: data.is_waitlisted };
}

export async function unregisterFromActivityAction(activityId: string): Promise<ActionResult> {
  const profile = await requireProfile();
  const supabase = await createClient();

  const { error } = await supabase
    .from("activity_registrations")
    .delete()
    .eq("activity_id", activityId)
    .eq("profile_id", profile.id);

  if (error) {
    return { error: "Afmelden is niet gelukt. Probeer het opnieuw." };
  }

  invalidateQuery("statistieken-activiteiten");
  revalidatePath(`/agenda/${activityId}`);
  revalidatePath("/agenda");
  return {};
}

export type ActivityFormState = {
  error?: string;
  success?: boolean;
  // Gezet door updateActivityAction wanneer datum/tijd/locatie wijzigde op
  // een activiteit die al aanmeldingen heeft — ActivityForm toont dan een
  // los, bewerkbaar bevestigingsblok i.p.v. de wijziging automatisch of
  // helemaal niet te melden.
  offerNotifyChange?: boolean;
  suggestedChangeMessage?: string;
};

function parseActivityForm(formData: FormData) {
  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const location = String(formData.get("location") ?? "").trim();
  const startsAtRaw = String(formData.get("starts_at") ?? "").trim();
  const endsAtRaw = String(formData.get("ends_at") ?? "").trim();
  const deadlineRaw = String(formData.get("registration_deadline") ?? "").trim();
  const maxParticipantsRaw = String(formData.get("max_participants") ?? "").trim();
  const maxParticipantsNumber = maxParticipantsRaw ? Number(maxParticipantsRaw) : NaN;
  const externalRegistrationChecked = formData.get("external_registration") === "on";
  const externalRegistrationUrl = String(formData.get("external_registration_url") ?? "").trim();
  const allowPublicRegistration = formData.get("allow_public_registration") === "on";

  return {
    title,
    startsAt: parseIsoOrNull(startsAtRaw),
    description: description || null,
    location: location || null,
    ends_at: parseIsoOrNull(endsAtRaw),
    registration_deadline: parseIsoOrNull(deadlineRaw),
    max_participants: Number.isFinite(maxParticipantsNumber) && maxParticipantsNumber > 0 ? maxParticipantsNumber : null,
    external_registration_url: externalRegistrationChecked && externalRegistrationUrl ? externalRegistrationUrl : null,
    allow_public_registration: allowPublicRegistration,
  };
}

// Alleen relevant bij het AANMAKEN van een VOC-activiteit (zie showTypePicker
// in ActivityForm) — bij bewerken staan deze switches niet meer op het
// formulier (UX-review punt 13: ze suggereerden bij bewerken een melding die
// de onderliggende trigger daar nooit verstuurt) en moet updateActivityAction
// de al-opgeslagen waarden dus ongemoeid laten.
function parseNotifyChannels(formData: FormData) {
  return {
    notify_push: formData.has("notify_push") ? formData.get("notify_push") === "on" : true,
    notify_email: formData.has("notify_email") ? formData.get("notify_email") === "on" : true,
  };
}

// Bijlagen worden uitsluitend via ActivityAttachmentUploadForm toegevoegd
// (addActivityAttachmentAction hieronder) — dat was eerder ook via een los
// veld op dit formulier mogelijk, wat op het bewerkscherm twee onafhankelijke
// upload-plekken gaf (UX-review punt 14). Een nieuwe activiteit krijgt
// bijlagen dus pas na het aanmaken, via "Bewerken" — één plek, altijd
// dezelfde (echte) 25MB-limiet en dezelfde Nederlandse foutmelding.

export async function createActivityAction(
  _prevState: ActivityFormState,
  formData: FormData
): Promise<ActivityFormState> {
  try {
    // Elk actief lid mag indienen — de normalize_activity_submission-trigger
    // (migratie 0015) bepaalt op basis van de echte rol of dit een meteen
    // goedgekeurde VOC-activiteit wordt of een pending community-inzending.
    const profile = await requireProfile();
    const { title, startsAt, ...rest } = parseActivityForm(formData);
    const notifyChannels = parseNotifyChannels(formData);

    if (!title || !startsAt) {
      return { error: "Titel en een geldige startdatum zijn verplicht." };
    }

    // Alleen relevant voor bestuur/beheer (zie showTypePicker in
    // ActivityForm) — voor iedereen anders forceert de trigger toch altijd
    // 'lid', ongeacht wat hier wordt meegestuurd.
    const source = String(formData.get("source") ?? "") === "lid" ? "lid" : "voc";

    const supabase = await createClient();
    const slug = await generateUniqueSlug(supabase, title);
    const { data: activity, error } = await supabase
      .from("activities")
      .insert({ title, starts_at: startsAt, ...rest, ...notifyChannels, source, slug, created_by: profile.id })
      .select("id")
      .single();

    if (error || !activity) {
      return { error: "Aanmaken is niet gelukt. Probeer het opnieuw." };
    }

    const image = formData.get("image");
    if (image instanceof File && image.size > 0) {
      const result = await uploadImage(supabase, "activity-images", activity.id, image);
      if (!("error" in result)) {
        await supabase.from("activities").update({ image_url: result.path }).eq("id", activity.id);
      }
    }

    revalidatePath("/agenda");
    redirect(`/agenda/${activity.id}`);
  } catch (cause) {
    if (isNextRedirectError(cause)) throw cause;
    console.error("[agenda] createActivityAction failed:", cause);
    return { error: "Er ging iets onverwachts mis bij het aanmaken. Probeer het opnieuw." };
  }
}

export async function updateActivityAction(
  activityId: string,
  _prevState: ActivityFormState,
  formData: FormData
): Promise<ActivityFormState> {
  try {
    await requireBoard();
    const { title, startsAt, ...rest } = parseActivityForm(formData);

    if (!title || !startsAt) {
      return { error: "Titel en een geldige startdatum zijn verplicht." };
    }

    const supabase = await createClient();

    const { data: existing } = await supabase
      .from("activities")
      .select("image_url, starts_at, ends_at, location")
      .eq("id", activityId)
      .maybeSingle();

    let imagePath: string | undefined;
    const image = formData.get("image");
    if (image instanceof File && image.size > 0) {
      const result = await uploadImage(supabase, "activity-images", activityId, image);
      if ("error" in result) return { error: result.error };
      imagePath = result.path;
    }

    const { error } = await supabase
      .from("activities")
      .update({
        title,
        starts_at: startsAt,
        ...rest,
        ...(imagePath ? { image_url: imagePath } : {}),
      })
      .eq("id", activityId);

    if (error) {
      return { error: "Opslaan is niet gelukt. Probeer het opnieuw." };
    }

    if (imagePath) {
      await removePreviousImage(supabase, "activity-images", existing?.image_url ?? null);
    }

    await logAuditAction("activity_updated", "activity", activityId);

    revalidatePath(`/agenda/${activityId}`);
    revalidatePath("/agenda");

    // UX-review punt 1/13: wie al is aangemeld, verdient een expliciet
    // bericht als de datum/tijd/locatie wijzigt — maar automatisch versturen
    // bij elke edit zou ruis worden, en stilzwijgend niets doen was het oude
    // (verwarrende) gedrag. Dus: alleen een bewerkbaar voorstel aanbieden
    // als er iets relevants veranderde ÉN er daadwerkelijk aanmeldingen zijn.
    const relevantChange =
      existing && (existing.starts_at !== startsAt || existing.ends_at !== rest.ends_at || existing.location !== rest.location);
    if (relevantChange) {
      const { count } = await supabase
        .from("activity_registrations")
        .select("id", { count: "exact", head: true })
        .eq("activity_id", activityId);
      if ((count ?? 0) > 0) {
        return {
          success: true,
          offerNotifyChange: true,
          suggestedChangeMessage: `De datum, tijd of locatie van "${title}" is gewijzigd. Bekijk de actuele gegevens in de agenda.`,
        };
      }
    }

    return { success: true };
  } catch (cause) {
    if (isNextRedirectError(cause)) throw cause;
    console.error("[agenda] updateActivityAction failed:", cause);
    return { error: "Er ging iets onverwachts mis bij het opslaan. Probeer het opnieuw." };
  }
}

// redirectAfter=true (standaard) is voor de detailpagina/-overlay, waar de
// activiteit na verwijderen niet meer bestaat en je dus weg moet; false is
// voor een lijstcontext (beheer-overzicht) die na verwijderen gewoon op
// dezelfde plek moet blijven met de rij eruit.
//
// UX-review punt 21: verwijderen cascadet aanmeldingen stilzwijgend weg,
// zonder dat de aangemelden iets horen. De UI biedt daarom bij aanmeldingen
// > 0 geen verwijderknop meer aan (zie CancelActivityButton/ActivityDetail-
// Content/BeheerAgendaContent), maar deze check blijft hier ook staan als
// server-side vangnet tegen een directe aanroep.
export async function deleteActivityAction(activityId: string, redirectAfter = true) {
  try {
    // requireProfile (niet requireBoard): RLS staat een lid ook toe zijn
    // eigen, nog-niet-beoordeelde inzending in te trekken
    // (activities_self_delete_pending) — bestuur kan altijd verwijderen.
    await requireProfile();
    const supabase = await createClient();

    const { count } = await supabase
      .from("activity_registrations")
      .select("id", { count: "exact", head: true })
      .eq("activity_id", activityId);
    if ((count ?? 0) > 0) {
      throw new Error(
        `Deze activiteit heeft ${count} aanmelding(en) en kan daarom niet verwijderd worden. Gebruik "Afgelasten" om aangemelden te informeren.`
      );
    }

    await supabase.from("activities").delete().eq("id", activityId);
    invalidateQuery("statistieken-activiteiten");
    revalidatePath("/agenda");
    revalidatePath("/beheer/agenda");
    if (redirectAfter) redirect("/agenda");
  } catch (cause) {
    if (isNextRedirectError(cause)) throw cause;
    console.error("[agenda] deleteActivityAction failed:", cause);
    throw cause;
  }
}

export type CancelActivityState = { error?: string; success?: boolean };

// Afgelasten i.p.v. verwijderen: de activiteit blijft zichtbaar (met een
// "Afgelast"-badge, zie ActivityDetailContent/BeheerAgendaContent) en kan
// niet meer geboekt worden, maar bestaande aanmeldingen blijven bestaan.
// Iedere aangemelde krijgt een gerichte melding via de bestaande
// notifications-tabel/dispatch; niet-leden (public_activity_registrations)
// via een losse e-mail, want die hebben geen profile_id.
export async function cancelActivityAction(activityId: string, message: string): Promise<CancelActivityState> {
  await requireBoard();
  const supabase = await createClient();

  const { data: activity } = await supabase.from("activities").select("title").eq("id", activityId).maybeSingle();
  if (!activity) {
    return { error: "Activiteit niet gevonden." };
  }

  const { error } = await supabase.from("activities").update({ status: "cancelled" }).eq("id", activityId);
  if (error) {
    return { error: "Afgelasten is niet gelukt. Probeer het opnieuw." };
  }

  const body = message.trim() || `"${activity.title}" is afgelast.`;
  const { data: nonMembers } = await supabase.rpc("notify_activity_participants", {
    p_activity_id: activityId,
    p_type: "activity_cancelled",
    p_title: "Activiteit afgelast",
    p_body: body,
  });

  for (const recipient of nonMembers ?? []) {
    if (recipient.email) {
      await sendRawHtmlEmail(recipient.email, "Activiteit afgelast", `<p>${escapeHtml(body)}</p>`);
    }
  }

  await logAuditAction("activity_cancelled", "activity", activityId);
  invalidateQuery("statistieken-activiteiten");
  revalidatePath(`/agenda/${activityId}`);
  revalidatePath("/agenda");
  revalidatePath("/beheer/agenda");
  return { success: true };
}

// Door updateActivityAction's offerNotifyChange aangeboden, pas verstuurd
// als het bestuur dat ook echt bevestigt (zie het bevestigbare tekstblok in
// ActivityForm) — geen automatische melding bij elke bewerking.
export async function notifyActivityChangeAction(activityId: string, message: string): Promise<CancelActivityState> {
  await requireBoard();
  const supabase = await createClient();

  const { data: activity } = await supabase.from("activities").select("title").eq("id", activityId).maybeSingle();
  if (!activity) {
    return { error: "Activiteit niet gevonden." };
  }

  const body = message.trim() || `De gegevens van "${activity.title}" zijn gewijzigd.`;
  const { data: nonMembers } = await supabase.rpc("notify_activity_participants", {
    p_activity_id: activityId,
    p_type: "activity_changed",
    p_title: "Activiteit gewijzigd",
    p_body: body,
  });

  for (const recipient of nonMembers ?? []) {
    if (recipient.email) {
      await sendRawHtmlEmail(recipient.email, "Activiteit gewijzigd", `<p>${escapeHtml(body)}</p>`);
    }
  }

  await logAuditAction("activity_change_notified", "activity", activityId);
  return { success: true };
}

export async function decideActivitySubmissionAction(
  activityId: string,
  decision: "approved" | "rejected",
  rejectionReason?: string,
  notifyPush = false,
  notifyEmail = false
) {
  await requireBoard();
  const supabase = await createClient();

  await supabase
    .from("activities")
    .update({
      status: decision,
      rejection_reason: decision === "rejected" ? (rejectionReason ?? null) : null,
      // Alleen relevant bij goedkeuren — dat is het moment waarop
      // notify_activity_published (0019/0040) de new_activity-notificatie
      // aanmaakt en deze kolommen naar de notificatie-rijen kopieert.
      ...(decision === "approved" ? { notify_push: notifyPush, notify_email: notifyEmail } : {}),
    })
    .eq("id", activityId);

  await logAuditAction(
    decision === "approved" ? "activity_approved" : "activity_rejected",
    "activity",
    activityId,
    decision === "rejected" ? { rejection_reason: rejectionReason ?? null } : {}
  );

  revalidatePath(`/agenda/${activityId}`);
  revalidatePath("/agenda");
}

// Onderscheidt "aangemeld" van "echt geweest" — bestuur vinkt na afloop af
// wie er daadwerkelijk was, wat de basis is voor "Bijgewoonde evenementen"
// op het ledenprofiel.
export async function setAttendanceAction(registrationId: string, activityId: string, attended: boolean) {
  await requireBoard();
  const supabase = await createClient();

  await supabase.from("activity_registrations").update({ attended }).eq("id", registrationId);

  invalidateQuery("statistieken-activiteiten");
  revalidatePath(`/agenda/${activityId}`);
}

export type AttachmentFormState = { error?: string; success?: boolean };

export async function addActivityAttachmentAction(
  activityId: string,
  _prevState: AttachmentFormState,
  formData: FormData
): Promise<AttachmentFormState> {
  const profile = await requireBoard();
  const file = formData.get("file");

  if (!(file instanceof File) || file.size === 0) {
    return { error: "Kies een bestand om toe te voegen." };
  }

  const supabase = await createClient();
  const result = await uploadDocument(supabase, file, "activity-attachments");
  if ("error" in result) {
    return { error: result.error };
  }

  const { error } = await supabase.from("activity_attachments").insert({
    activity_id: activityId,
    storage_path: result.path,
    file_name: file.name,
    created_by: profile.id,
  });

  if (error) {
    return { error: "Opslaan is niet gelukt. Probeer het opnieuw." };
  }

  revalidatePath(`/agenda/${activityId}`);
  revalidatePath(`/agenda/${activityId}/bewerken`);
  return { success: true };
}

export async function deleteActivityAttachmentAction(activityId: string, attachmentId: string, storagePath: string) {
  await requireBoard();
  const supabase = await createClient();
  await supabase.storage.from("activity-attachments").remove([storagePath]);
  await supabase.from("activity_attachments").delete().eq("id", attachmentId);
  revalidatePath(`/agenda/${activityId}`);
  revalidatePath(`/agenda/${activityId}/bewerken`);
}
