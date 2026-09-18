"use server";

import { createClient } from "@/lib/supabase/server";

export type SetPasswordState = { error?: string; success?: boolean };

export async function setPasswordAction(
  _prevState: SetPasswordState,
  formData: FormData
): Promise<SetPasswordState> {
  const password = String(formData.get("password") ?? "");

  if (password.length < 8) {
    return { error: "Kies een wachtwoord van minimaal 8 tekens." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password });

  if (error) {
    return { error: "Wachtwoord instellen is niet gelukt. Vraag een nieuwe resetlink aan." };
  }

  return { success: true };
}
