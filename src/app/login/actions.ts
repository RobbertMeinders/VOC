"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isEmailConfigured, sendTemplatedEmail } from "@/lib/email/send";
import { isEmailRateLimited, isPasswordLoginRateLimited, recordFailedPasswordLoginAttempt } from "@/lib/auth/rate-limit";
import { REMEMBERED_MAX_AGE, REMEMBER_ME_COOKIE } from "@/lib/supabase/session-persistence";
import { safeRedirectPath } from "@/lib/url/safeRedirect";

export type LoginState = { error?: string };

export async function signInAction(_prevState: LoginState, formData: FormData): Promise<LoginState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const redirectTo = String(formData.get("redirectTo") ?? "/");
  const rememberMe = formData.get("remember") === "on";

  if (!email || !password) {
    return { error: "Vul je e-mailadres en wachtwoord in." };
  }

  // In tegenstelling tot de magic-link/wachtwoord-reset-flows (die dit al
  // langer deden) had wachtwoord-inloggen zelf nog geen rate limiting —
  // precies het klassieke brute-force-doelwit. Telt hier bewust alleen
  // mislukte pogingen (zie de registratie verderop) — anders liep een
  // account dat gewoon herhaaldelijk succesvol inlogt (bv. op meerdere
  // apparaten kort na elkaar) na een paar keer alsnog tegen de limiet aan.
  if (await isPasswordLoginRateLimited(email)) {
    return { error: "Te veel inlogpogingen. Probeer het over een kwartier opnieuw." };
  }

  // Set this before creating the Supabase client so it picks the right
  // cookie maxAge for the session cookies it's about to write.
  const cookieStore = await cookies();
  if (rememberMe) {
    cookieStore.set(REMEMBER_ME_COOKIE, "1", {
      maxAge: REMEMBERED_MAX_AGE,
      path: "/",
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
    });
  } else {
    cookieStore.delete(REMEMBER_ME_COOKIE);
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    await recordFailedPasswordLoginAttempt(email);
    return { error: "E-mailadres of wachtwoord onjuist." };
  }

  // "Laatst actief" (zichtbaar voor bestuur/beheer, zie /leden/[id]) wordt
  // bewust alleen hier gezet — bij een echte inlog — en niet bij elke
  // achtergrond-request.
  if (data.user) {
    await supabase.from("profiles").update({ last_active_at: new Date().toISOString() }).eq("id", data.user.id);
  }

  redirect(safeRedirectPath(redirectTo));
}

export type MagicLinkState = { submitted?: boolean; error?: string };

export async function signInWithMagicLinkAction(
  _prevState: MagicLinkState,
  formData: FormData
): Promise<MagicLinkState> {
  // De knop hiervoor staat al verborgen op /login zolang mail niet
  // geconfigureerd is — dit is alleen verdediging tegen een directe POST op
  // een verlopen/gecachte pagina, zodat niemand een valse "check je mail"
  // te zien krijgt voor een link die nooit komt.
  if (!isEmailConfigured()) {
    return { error: "Inloggen zonder wachtwoord is momenteel niet beschikbaar." };
  }

  const email = String(formData.get("email") ?? "").trim();
  const redirectTo = String(formData.get("redirectTo") ?? "/");
  const rememberMe = formData.get("remember") === "on";

  if (email && !(await isEmailRateLimited("magic_link_requested", email))) {
    try {
      // Zelfde patroon als wachtwoord-reset: generateLink maakt alleen de
      // token, geen Supabase-mail — zo blijft dit via ons eigen (door
      // bestuur bewerkbare) template en de eigen SMTP-mailbox lopen. Bestaat het
      // e-mailadres niet, dan gooit generateLink hier een error — die
      // lekken we bewust niet naar de aanvrager (zie catch hieronder).
      const admin = createAdminClient();
      const { data } = await admin.auth.admin.generateLink({ type: "magiclink", email });
      const hashedToken = data?.properties?.hashed_token;

      if (hashedToken) {
        const next = safeRedirectPath(redirectTo);
        const link = `${process.env.SITE_URL ?? ""}/auth/confirm?token_hash=${hashedToken}&type=magiclink&next=${encodeURIComponent(next)}`;
        await sendTemplatedEmail("inloggen_magic_link", email, { link });
      }
    } catch {
      // Zie wachtwoord-vergeten/actions.ts — geen enumeratie van bestaande
      // e-mailadressen.
    }
  }

  // "Onthoud mij" moet al gezet zijn vóórdat de link straks in
  // /auth/confirm geverifieerd wordt (dat is waar de sessiecookies
  // daadwerkelijk geschreven worden) — dus hier alvast zetten, net als bij
  // het gewone wachtwoord-inloggen.
  const cookieStore = await cookies();
  if (rememberMe) {
    cookieStore.set(REMEMBER_ME_COOKIE, "1", {
      maxAge: REMEMBERED_MAX_AGE,
      path: "/",
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
    });
  } else {
    cookieStore.delete(REMEMBER_ME_COOKIE);
  }

  return { submitted: true };
}
