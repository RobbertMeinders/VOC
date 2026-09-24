"use server";

import { revalidatePath } from "next/cache";
import { requireBoard } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

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
