"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireBoard } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { uploadImage } from "@/lib/supabase/upload";
import { logAuditAction } from "@/lib/audit/log";
import { buildEventSnapshot } from "@/lib/newsletter/eventSnapshot";
import type { NewsletterEventBlock } from "@/lib/newsletter/types";

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
        sender_name: "Veendammer Ondernemer Compagnie",
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
    .update({ subject, preheader: preheader || null, sender_name: senderName || null, content })
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
  existingBlockId?: string
): Promise<EventSnapshotState> {
  await requireBoard();
  const supabase = await createClient();

  const { data: activity } = await supabase.from("activities").select("*").eq("id", activityId).maybeSingle();
  if (!activity) {
    return { error: "Deze activiteit bestaat niet (meer)." };
  }

  const block = await buildEventSnapshot(supabase, activity, existingBlockId);
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
        sender_name: "Veendammer Ondernemer Compagnie",
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
