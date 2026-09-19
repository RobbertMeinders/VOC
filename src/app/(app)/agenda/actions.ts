"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireBoard, requireProfile } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { uploadImage } from "@/lib/supabase/upload";

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

export async function registerForActivityAction(activityId: string): Promise<ActionResult> {
  const profile = await requireProfile();
  const supabase = await createClient();

  const { error } = await supabase
    .from("activity_registrations")
    .insert({ activity_id: activityId, profile_id: profile.id });

  if (error) {
    // The enforce_activity_registration_rules trigger raises a friendly Dutch
    // message for the deadline/capacity cases; a unique-violation means the
    // member is already registered (e.g. a second tab). Everything else
    // falls back to a generic message.
    if (error.code === "23505") {
      return { error: "Je bent al aangemeld." };
    }
    return { error: error.message || "Aanmelden is niet gelukt. Probeer het opnieuw." };
  }

  revalidatePath(`/agenda/${activityId}`);
  revalidatePath("/agenda");
  return {};
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

  return {
    title,
    startsAt: parseIsoOrNull(startsAtRaw),
    description: description || null,
    location: location || null,
    ends_at: parseIsoOrNull(endsAtRaw),
    registration_deadline: parseIsoOrNull(deadlineRaw),
    max_participants: Number.isFinite(maxParticipantsNumber) && maxParticipantsNumber > 0 ? maxParticipantsNumber : null,
  };
}

export async function createActivityAction(
  _prevState: ActivityFormState,
  formData: FormData
): Promise<ActivityFormState> {
  try {
    const profile = await requireBoard();
    const { title, startsAt, ...rest } = parseActivityForm(formData);

    if (!title || !startsAt) {
      return { error: "Titel en een geldige startdatum zijn verplicht." };
    }

    const supabase = await createClient();
    const { data: activity, error } = await supabase
      .from("activities")
      .insert({ title, starts_at: startsAt, ...rest, created_by: profile.id })
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

    revalidatePath(`/agenda/${activityId}`);
    revalidatePath("/agenda");
    return { success: true };
  } catch (cause) {
    if (isNextRedirectError(cause)) throw cause;
    console.error("[agenda] updateActivityAction failed:", cause);
    return { error: "Er ging iets onverwachts mis bij het opslaan. Probeer het opnieuw." };
  }
}

export async function deleteActivityAction(activityId: string) {
  try {
    await requireBoard();
    const supabase = await createClient();
    await supabase.from("activities").delete().eq("id", activityId);
    revalidatePath("/agenda");
    redirect("/agenda");
  } catch (cause) {
    if (isNextRedirectError(cause)) throw cause;
    console.error("[agenda] deleteActivityAction failed:", cause);
    throw cause;
  }
}
