"use server";

import { createClient } from "@/lib/supabase/server";

export type BootstrapState = { error?: string; success?: boolean; needsEmailConfirmation?: boolean };

export async function bootstrapRegisterAction(
  _prevState: BootstrapState,
  formData: FormData
): Promise<BootstrapState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const firstName = String(formData.get("first_name") ?? "").trim();
  const lastName = String(formData.get("last_name") ?? "").trim();

  if (!email || !password || !firstName || !lastName) {
    return { error: "Vul alle velden in." };
  }
  if (password.length < 8) {
    return { error: "Kies een wachtwoord van minimaal 8 tekens." };
  }

  const supabase = await createClient();

  const { data: alreadyInitialized } = await supabase.rpc("has_any_profiles");
  if (alreadyInitialized) {
    return { error: "Er bestaat al een account. Vraag een uitnodiging aan het bestuur." };
  }

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { first_name: firstName, last_name: lastName },
    },
  });

  if (error) {
    if (error.message.toLowerCase().includes("already registered")) {
      return { error: "Er bestaat al een account met dit e-mailadres." };
    }
    return { error: `Registreren is niet gelukt: ${error.message}` };
  }

  return { success: true, needsEmailConfirmation: !data.session };
}
