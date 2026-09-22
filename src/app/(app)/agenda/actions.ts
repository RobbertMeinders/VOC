"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireBoard, requireProfile } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { uploadImage } from "@/lib/supabase/upload";
import { uploadDocument } from "@/lib/supabase/uploadDocument";

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
    // a generic message.
    if (error.code === "23505") {
      return { error: "Je bent al aangemeld." };
    }
    return { error: error.message || "Aanmelden is niet gelukt. Probeer het opnieuw." };
  }

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

  revalidatePath(`/agenda/${activityId}`);
  revalidatePath("/agenda");
  return {};
}

export type ActivityFormState = { error?: string; success?: boolean };

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

  return {
    title,
    startsAt: parseIsoOrNull(startsAtRaw),
    description: description || null,
    location: location || null,
    ends_at: parseIsoOrNull(endsAtRaw),
    registration_deadline: parseIsoOrNull(deadlineRaw),
    max_participants: Number.isFinite(maxParticipantsNumber) && maxParticipantsNumber > 0 ? maxParticipantsNumber : null,
    external_registration_url: externalRegistrationChecked && externalRegistrationUrl ? externalRegistrationUrl : null,
  };
}

const ATTACHMENT_MAX_BYTES = 15 * 1024 * 1024;

// Gedeeld door create/update: bijlagen horen nu bij het aanmaken/wijzigen
// van de activiteit zelf, niet meer bij een los formulier op de eventpagina
// (zie ActivityAttachmentUploadForm, die alleen nog op de bewerkpagina
// achteraf iets toevoegt).
async function uploadActivityAttachments(
  supabase: Awaited<ReturnType<typeof createClient>>,
  activityId: string,
  createdBy: string,
  formData: FormData
) {
  const files = formData.getAll("attachments").filter((f): f is File => f instanceof File && f.size > 0);
  for (const file of files) {
    if (file.size > ATTACHMENT_MAX_BYTES) continue;
    const result = await uploadDocument(supabase, file, "activity-attachments");
    if ("error" in result) continue;
    await supabase.from("activity_attachments").insert({
      activity_id: activityId,
      storage_path: result.path,
      file_name: file.name,
      created_by: createdBy,
    });
  }
}

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

    if (!title || !startsAt) {
      return { error: "Titel en een geldige startdatum zijn verplicht." };
    }

    // Alleen relevant voor bestuur/beheer (zie showTypePicker in
    // ActivityForm) — voor iedereen anders forceert de trigger toch altijd
    // 'lid', ongeacht wat hier wordt meegestuurd.
    const source = String(formData.get("source") ?? "") === "lid" ? "lid" : "voc";

    const supabase = await createClient();
    const { data: activity, error } = await supabase
      .from("activities")
      .insert({ title, starts_at: startsAt, ...rest, source, created_by: profile.id })
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

    await uploadActivityAttachments(supabase, activity.id, profile.id, formData);

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
    const board = await requireBoard();
    const { title, startsAt, ...rest } = parseActivityForm(formData);

    if (!title || !startsAt) {
      return { error: "Titel en een geldige startdatum zijn verplicht." };
    }

    const supabase = await createClient();

    let imagePath: string | undefined;
    const image = formData.get("image");
    if (image instanceof File && image.size > 0) {
      const result = await uploadImage(supabase, "activity-images", activityId, image);
      if ("error" in result) return { error: result.error };
      imagePath = result.path;
    }

    await uploadActivityAttachments(supabase, activityId, board.id, formData);

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

    revalidatePath(`/agenda/${activityId}`);
    revalidatePath("/agenda");
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
export async function deleteActivityAction(activityId: string, redirectAfter = true) {
  try {
    // requireProfile (niet requireBoard): RLS staat een lid ook toe zijn
    // eigen, nog-niet-beoordeelde inzending in te trekken
    // (activities_self_delete_pending) — bestuur kan altijd verwijderen.
    await requireProfile();
    const supabase = await createClient();
    await supabase.from("activities").delete().eq("id", activityId);
    revalidatePath("/agenda");
    revalidatePath("/beheer/agenda");
    if (redirectAfter) redirect("/agenda");
  } catch (cause) {
    if (isNextRedirectError(cause)) throw cause;
    console.error("[agenda] deleteActivityAction failed:", cause);
    throw cause;
  }
}

export async function decideActivitySubmissionAction(
  activityId: string,
  decision: "approved" | "rejected",
  rejectionReason?: string
) {
  await requireBoard();
  const supabase = await createClient();

  await supabase
    .from("activities")
    .update({ status: decision, rejection_reason: decision === "rejected" ? (rejectionReason ?? null) : null })
    .eq("id", activityId);

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
