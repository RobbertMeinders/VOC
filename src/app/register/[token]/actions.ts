"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { REMEMBERED_MAX_AGE, REMEMBER_ME_COOKIE } from "@/lib/supabase/session-persistence";

export type CompanyOption = { id: string; name: string; city: string | null };

export async function searchCompaniesAction(query: string): Promise<CompanyOption[]> {
  if (query.trim().length < 2) return [];

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("search_companies_for_signup", { p_query: query });

  if (error || !data) return [];
  return data;
}

export type RegisterState = { error?: string };

export async function registerAction(
  token: string,
  _prevState: RegisterState,
  formData: FormData
): Promise<RegisterState> {
  const email = String(formData.get("email") ?? "").trim();
  const firstName = String(formData.get("first_name") ?? "").trim();
  const lastName = String(formData.get("last_name") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();
  const jobTitle = String(formData.get("job_title") ?? "").trim();
  const companyMode = String(formData.get("company_mode") ?? "existing");
  const companyId = String(formData.get("company_id") ?? "").trim();
  const newCompanyName = String(formData.get("new_company_name") ?? "").trim();
  const newCompanyIndustry = String(formData.get("new_company_industry") ?? "").trim();
  const newCompanyCity = String(formData.get("new_company_city") ?? "").trim();
  const newCompanyWebsite = String(formData.get("new_company_website") ?? "").trim();

  if (!email || !firstName || !lastName) {
    return { error: "Vul alle verplichte velden in." };
  }
  if (companyMode === "existing" && !companyId) {
    return { error: "Zoek en selecteer je bedrijf, of maak een nieuw bedrijf aan." };
  }
  if (companyMode === "new" && !newCompanyName) {
    return { error: "Vul de bedrijfsnaam in." };
  }

  // Wachtwoordloos account aanmaken: we genereren zelf een invite-token
  // (service-role, net als bij wachtwoord-reset) en verifiëren 'm meteen
  // hierna met de gewone server-client — dat schrijft de sessiecookies
  // direct weg, dus geen tweede e-mail of extra klik nodig. auth.users
  // wordt hierbij aangemaakt, wat de bestaande handle_new_user()-trigger
  // triggert (leest dezelfde metadata als voorheen via signUp).
  const admin = createAdminClient();
  const { data: linkData, error: linkError } = await admin.auth.admin.generateLink({
    type: "invite",
    email,
    options: {
      data: {
        invitation_token: token,
        first_name: firstName,
        last_name: lastName,
        phone: phone || null,
        job_title: jobTitle || null,
        company_id: companyMode === "existing" ? companyId : null,
        new_company_name: companyMode === "new" ? newCompanyName : null,
        new_company_industry: companyMode === "new" ? newCompanyIndustry || null : null,
        new_company_city: companyMode === "new" ? newCompanyCity || null : null,
        new_company_website: companyMode === "new" ? newCompanyWebsite || null : null,
      },
    },
  });

  if (linkError || !linkData?.properties?.hashed_token) {
    if (linkError?.message.toLowerCase().includes("already been registered")) {
      return { error: "Er bestaat al een account met dit e-mailadres." };
    }
    return { error: "Registreren is niet gelukt. Controleer de uitnodigingslink en probeer opnieuw." };
  }

  // Nieuwe accounts blijven meteen ingelogd — er is nog geen moment geweest
  // om "onthoud mij" te kiezen, en opnieuw moeten inloggen vlak na het
  // activeren zou de drempel juist weer verhogen.
  const cookieStore = await cookies();
  cookieStore.set(REMEMBER_ME_COOKIE, "1", {
    maxAge: REMEMBERED_MAX_AGE,
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });

  const supabase = await createClient();
  const { data: verifyData, error: verifyError } = await supabase.auth.verifyOtp({
    type: "invite",
    token_hash: linkData.properties.hashed_token,
  });

  if (verifyError || !verifyData.user) {
    return { error: "Registreren is niet gelukt. Controleer de uitnodigingslink en probeer opnieuw." };
  }

  await supabase.from("profiles").update({ last_active_at: new Date().toISOString() }).eq("id", verifyData.user.id);

  redirect("/");
}
