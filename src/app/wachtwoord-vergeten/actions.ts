"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { isEmailConfigured, sendRawHtmlEmail, invitationGreeting } from "@/lib/email/send";
import { renderMessageEmail } from "@/lib/templates/message-render";
import { isEmailRateLimited } from "@/lib/auth/rate-limit";

export type ForgotPasswordState = { submitted?: boolean; error?: string };

export async function requestPasswordResetAction(
  _prevState: ForgotPasswordState,
  formData: FormData
): Promise<ForgotPasswordState> {
  // Zelfde verdediging als bij de magic-link-actie: de pagina verbergt dit
  // formulier al zolang mail niet geconfigureerd is.
  if (!isEmailConfigured()) {
    return { error: "Wachtwoord-reset via e-mail is momenteel niet beschikbaar." };
  }

  const email = String(formData.get("email") ?? "").trim();

  if (email && !(await isEmailRateLimited("password_reset_requested", email))) {
    try {
      // We versturen deze mail zelf (met een eigen, door bestuur bewerkbaar
      // sjabloon) i.p.v. Supabase Auth's ingebouwde resetPasswordForEmail —
      // generateLink genereert alleen de token, zonder zelf een mail te
      // versturen. token_hash/type/next matchen exact wat /auth/confirm al
      // verwacht (hetzelfde patroon als de signup-bevestigingsmail).
      const admin = createAdminClient();
      const { data } = await admin.auth.admin.generateLink({ type: "recovery", email });
      const hashedToken = data?.properties?.hashed_token;

      if (hashedToken) {
        const link = `${process.env.SITE_URL ?? ""}/auth/confirm?token_hash=${hashedToken}&type=recovery&next=/wachtwoord-instellen`;
        const { data: matchedProfile } = await admin.from("profiles").select("first_name").eq("email", email).maybeSingle();
        const rendered = await renderMessageEmail("reset", link, { greeting: invitationGreeting(matchedProfile?.first_name) });
        if (rendered) await sendRawHtmlEmail(email, rendered.subject, rendered.html, rendered.text);
      }
    } catch {
      // Bestaat het e-mailadres niet, dan faalt generateLink — dat lekken we
      // hieronder bewust niet naar de aanvrager.
    }
  }

  // Always report success, whether or not the email exists — this avoids
  // leaking which addresses have an account.
  return { submitted: true };
}
