"use server";

import { createClient } from "@/lib/supabase/server";

export type AccessRequestState = { error?: string; success?: boolean };

export async function submitAccessRequestAction(
  _prevState: AccessRequestState,
  formData: FormData
): Promise<AccessRequestState> {
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const message = String(formData.get("message") ?? "").trim();

  if (!name || !email) {
    return { error: "Vul je naam en e-mailadres in." };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("access_requests").insert({
    name,
    email,
    message: message || null,
  });

  if (error) {
    return { error: `Versturen is niet gelukt: ${error.message}` };
  }

  return { success: true };
}
