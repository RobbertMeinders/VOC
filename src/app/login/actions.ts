"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { REMEMBERED_MAX_AGE, REMEMBER_ME_COOKIE } from "@/lib/supabase/session-persistence";

export type LoginState = { error?: string };

export async function signInAction(_prevState: LoginState, formData: FormData): Promise<LoginState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const redirectTo = String(formData.get("redirectTo") ?? "/");
  const rememberMe = formData.get("remember") === "on";

  if (!email || !password) {
    return { error: "Vul je e-mailadres en wachtwoord in." };
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
    return { error: "E-mailadres of wachtwoord onjuist." };
  }

  // "Laatst actief" (zichtbaar voor bestuur/beheer, zie /leden/[id]) wordt
  // bewust alleen hier gezet — bij een echte inlog — en niet bij elke
  // achtergrond-request.
  if (data.user) {
    await supabase.from("profiles").update({ last_active_at: new Date().toISOString() }).eq("id", data.user.id);
  }

  redirect(redirectTo.startsWith("/") ? redirectTo : "/");
}
