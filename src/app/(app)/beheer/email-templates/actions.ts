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
