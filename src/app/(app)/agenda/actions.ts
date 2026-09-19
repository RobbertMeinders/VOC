"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireBoard, requireProfile } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { uploadImage } from "@/lib/supabase/upload";

export type ActionResult = { error?: string };

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

  return {
    title,
    startsAtRaw,
    description: description || null,
    location: location || null,
    ends_at: endsAtRaw ? new Date(endsAtRaw).toISOString() : null,
    registration_deadline: deadlineRaw ? new Date(deadlineRaw).toISOString() : null,
    max_participants: maxParticipantsRaw ? Number(maxParticipantsRaw) : null,
  };
}

export async function createActivityAction(
  _prevState: ActivityFormState,
  formData: FormData
): Promise<ActivityFormState> {
  const profile = await requireBoard();
  const { title, startsAtRaw, ...rest } = parseActivityForm(formData);

  if (!title || !startsAtRaw) {
    return { error: "Titel en startdatum zijn verplicht." };
  }

  const supabase = await createClient();
  const { data: activity, error } = await supabase
    .from("activities")
    .insert({ title, starts_at: new Date(startsAtRaw).toISOString(), ...rest, created_by: profile.id })
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
}

export async function updateActivityAction(
  activityId: string,
  _prevState: ActivityFormState,
  formData: FormData
): Promise<ActivityFormState> {
  await requireBoard();
  const { title, startsAtRaw, ...rest } = parseActivityForm(formData);

  if (!title || !startsAtRaw) {
    return { error: "Titel en startdatum zijn verplicht." };
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
      starts_at: new Date(startsAtRaw).toISOString(),
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
}

export async function deleteActivityAction(activityId: string) {
  await requireBoard();
  const supabase = await createClient();
  await supabase.from("activities").delete().eq("id", activityId);
  revalidatePath("/agenda");
  redirect("/agenda");
}
