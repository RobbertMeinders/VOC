"use server";

import { revalidatePath } from "next/cache";
import { requireBoard } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { uploadImage } from "@/lib/supabase/upload";

export type UpdateEmailTemplateState = { error?: string; success?: boolean };

export async function updateEmailTemplateAction(
  key: string,
  _prevState: UpdateEmailTemplateState,
  formData: FormData
): Promise<UpdateEmailTemplateState> {
  const profile = await requireBoard();

  const subject = String(formData.get("subject") ?? "").trim();
  const bodyHtml = String(formData.get("body_html") ?? "").trim();

  if (!subject || !bodyHtml) {
    return { error: "Onderwerp en inhoud zijn verplicht." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("email_templates")
    .update({ subject, body_html: bodyHtml, updated_by: profile.id })
    .eq("key", key);

  if (error) {
    return { error: "Opslaan is niet gelukt. Probeer het opnieuw." };
  }

  revalidatePath("/beheer/email-templates");
  return { success: true };
}

export type UploadEmailImageState = { error?: string; url?: string };

// Voor een logo/handtekening in de HTML-inhoud van een template — de
// email-assets-bucket is bewust publiek (zie migratie 0045), want een mail
// wordt door de ontvanger gelezen zonder Supabase-sessie, dus een private
// bucket/signed URL (die ook nog verloopt) is hier geen optie.
export async function uploadEmailTemplateImageAction(
  _prevState: UploadEmailImageState,
  formData: FormData
): Promise<UploadEmailImageState> {
  await requireBoard();

  const file = formData.get("image");
  if (!(file instanceof File) || file.size === 0) {
    return { error: "Kies een afbeelding om te uploaden." };
  }

  const supabase = await createClient();
  const result = await uploadImage(supabase, "email-assets", "logos", file);
  if ("error" in result) {
    return { error: result.error };
  }

  const { data } = supabase.storage.from("email-assets").getPublicUrl(result.path);
  return { url: data.publicUrl };
}

export type UpdatePushTemplateState = { error?: string; success?: boolean };

// Mirror van updateEmailTemplateAction, voor push_templates i.p.v.
// email_templates (0039_notification_templates.sql).
export async function updatePushTemplateAction(
  key: string,
  _prevState: UpdatePushTemplateState,
  formData: FormData
): Promise<UpdatePushTemplateState> {
  const profile = await requireBoard();

  const title = String(formData.get("title") ?? "").trim();
  const body = String(formData.get("body") ?? "").trim();

  if (!title || !body) {
    return { error: "Titel en bericht zijn verplicht." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("push_templates")
    .update({ title, body, updated_by: profile.id })
    .eq("key", key);

  if (error) {
    return { error: "Opslaan is niet gelukt. Probeer het opnieuw." };
  }

  revalidatePath("/beheer/email-templates");
  return { success: true };
}
