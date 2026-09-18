"use server";

import { createClient } from "@/lib/supabase/server";

export type ForgotPasswordState = { submitted?: boolean };

export async function requestPasswordResetAction(
  _prevState: ForgotPasswordState,
  formData: FormData
): Promise<ForgotPasswordState> {
  const email = String(formData.get("email") ?? "").trim();

  if (email) {
    const supabase = await createClient();
    // The Supabase "Reset Password" email template must link to
    // {{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=recovery&next=/wachtwoord-instellen
    // (same pattern as the signup confirmation template — see README).
    await supabase.auth.resetPasswordForEmail(email);
  }

  // Always report success, whether or not the email exists — this avoids
  // leaking which addresses have an account.
  return { submitted: true };
}
