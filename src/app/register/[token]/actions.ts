"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { REMEMBERED_MAX_AGE, REMEMBER_ME_COOKIE } from "@/lib/supabase/session-persistence";
import { validateDisplayNamePart } from "@/lib/validation/fields";
import { isEmailRateLimited } from "@/lib/auth/rate-limit";

// M13 (beveiligingsfixlijst Blok 3): elke afwijzing vóór het echte
// account-aanmaken moet dezelfde, generieke tekst geven — anders kan het
// verschil tussen "deze uitnodiging deugt niet" en "dit e-mailadres is al
// in gebruik" gebruikt worden om te testen of een gegokt e-mailadres al
// lid is, zonder dat de uitnodiging zelf ooit geldig hoefde te zijn.
const GENERIC_REGISTER_ERROR = "Registreren is niet gelukt. Controleer de uitnodigingslink en probeer opnieuw.";

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
  const password = String(formData.get("password") ?? "");
  const passwordRepeat = String(formData.get("password_repeat") ?? "");

  if (!email || !firstName || !lastName) {
    return { error: "Vul alle verplichte velden in." };
  }
  // M1: voor-/achternaam komen terecht in de weergavenaam van een
  // e-mailafzender (sendMemberContactEmail) — nooit tekens toestaan die
  // daar een adresveld kunnen laten lijken op iets anders dan het echte,
  // geverifieerde adres.
  const nameError = validateDisplayNamePart(firstName) ?? validateDisplayNamePart(lastName);
  if (nameError) {
    return { error: nameError };
  }
  if (companyMode === "existing" && !companyId) {
    return { error: "Zoek en selecteer je bedrijf, of maak een nieuw bedrijf aan." };
  }
  if (companyMode === "new" && !newCompanyName) {
    return { error: "Vul de bedrijfsnaam in." };
  }
  if (password.length < 8) {
    return { error: "Kies een wachtwoord van minimaal 8 tekens." };
  }
  if (password !== passwordRepeat) {
    return { error: "De wachtwoorden komen niet overeen." };
  }

  // M13: rate-limit vóór elke verdere check — zonder dit kon een script
  // onbeperkt e-mailadressen langs deze pagina proberen.
  if (await isEmailRateLimited("register_attempted", email)) {
    return { error: "Te veel pogingen met dit e-mailadres. Probeer het over een kwartier opnieuw." };
  }

  // M13: de uitnodiging zelf moet geldig zijn (en, als 'm aan een specifiek
  // adres gebonden is, bij dat adres horen) VOORDAT er iets gebeurt dat kan
  // verraden of het ingevulde e-mailadres al een account heeft —
  // generateLink hieronder doet dat namelijk linksom (een niet-bestaand
  // e-mailadres zou anders, mét een willekeurige/ongeldige token, al een
  // ander soort fout geven dan een bestaand adres). Dezelfde generieke
  // foutmelding voor "token ongeldig" als voor "account bestaat al".
  const anonSupabase = await createClient();
  const { data: previewRows } = await anonSupabase.rpc("get_invitation_preview", { p_token: token });
  const invitation = previewRows?.[0];
  if (!invitation?.valid || (invitation.email && invitation.email.toLowerCase() !== email.toLowerCase())) {
    return { error: GENERIC_REGISTER_ERROR };
  }

  // Account aanmaken: we genereren zelf een invite-token (service-role, net
  // als bij wachtwoord-reset) en verifiëren 'm meteen hierna met de gewone
  // server-client — dat schrijft de sessiecookies direct weg, dus geen
  // tweede e-mail of extra klik nodig. auth.users wordt hierbij aangemaakt,
  // wat de bestaande handle_new_user()-trigger triggert (leest dezelfde
  // metadata als voorheen via signUp).
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
    return { error: GENERIC_REGISTER_ERROR };
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
    return { error: GENERIC_REGISTER_ERROR };
  }

  await supabase.from("profiles").update({ last_active_at: new Date().toISOString() }).eq("id", verifyData.user.id);

  // Account bestaat nu al; een fout hier mag de activatie niet blokkeren —
  // het lid kan het wachtwoord later alsnog zetten via Instellingen.
  await supabase.auth.updateUser({ password });

  redirect("/");
}
