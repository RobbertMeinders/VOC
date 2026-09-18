"use server";

import { createClient } from "@/lib/supabase/server";

export type CompanyOption = { id: string; name: string; city: string | null };

export async function searchCompaniesAction(query: string): Promise<CompanyOption[]> {
  if (query.trim().length < 2) return [];

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("search_companies_for_signup", { p_query: query });

  if (error || !data) return [];
  return data;
}

export type RegisterState = { error?: string; success?: boolean; needsEmailConfirmation?: boolean };

export async function registerAction(
  token: string,
  _prevState: RegisterState,
  formData: FormData
): Promise<RegisterState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
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

  if (!email || !password || !firstName || !lastName) {
    return { error: "Vul alle verplichte velden in." };
  }
  if (password.length < 8) {
    return { error: "Kies een wachtwoord van minimaal 8 tekens." };
  }
  if (companyMode === "existing" && !companyId) {
    return { error: "Zoek en selecteer je bedrijf, of maak een nieuw bedrijf aan." };
  }
  if (companyMode === "new" && !newCompanyName) {
    return { error: "Vul de bedrijfsnaam in." };
  }

  const supabase = await createClient();

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
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

  if (error) {
    if (error.message.toLowerCase().includes("already registered")) {
      return { error: "Er bestaat al een account met dit e-mailadres." };
    }
    return { error: "Registreren is niet gelukt. Controleer de uitnodigingslink en probeer opnieuw." };
  }

  return { success: true, needsEmailConfirmation: !data.session };
}
