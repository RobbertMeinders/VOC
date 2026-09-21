"use server";

import { revalidatePath } from "next/cache";
import { requireBoard, requireProfile } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { uploadImage } from "@/lib/supabase/upload";
import { geocodeAddress } from "@/lib/geo/geocode";

export type UpdateCompanyState = { error?: string; success?: boolean };

export async function updateCompanyAction(
  companyId: string,
  _prevState: UpdateCompanyState,
  formData: FormData
): Promise<UpdateCompanyState> {
  await requireBoard();

  const name = String(formData.get("name") ?? "").trim();
  const tagline = String(formData.get("tagline") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const industry = String(formData.get("industry") ?? "").trim();
  const website = String(formData.get("website") ?? "").trim();
  const city = String(formData.get("city") ?? "").trim();
  const address = String(formData.get("address") ?? "").trim();
  const postalCode = String(formData.get("postal_code") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const linkedinUrl = String(formData.get("linkedin_url") ?? "").trim();
  const instagramUrl = String(formData.get("instagram_url") ?? "").trim();
  const facebookUrl = String(formData.get("facebook_url") ?? "").trim();

  if (!name) {
    return { error: "Bedrijfsnaam is verplicht." };
  }

  const supabase = await createClient();

  let logoPath: string | undefined;
  const logoFile = formData.get("logo");
  if (logoFile instanceof File && logoFile.size > 0) {
    const result = await uploadImage(supabase, "company-logos", companyId, logoFile);
    if ("error" in result) return { error: result.error };
    logoPath = result.path;
  }

  // Opnieuw geocoderen (Nominatim-aanroep) als het adres wijzigde, of als
  // er nog helemaal geen coördinaten bekend zijn — dat laatste vangt zowel
  // bedrijven die vóór deze functie al een adres hadden ingevuld, als een
  // eerdere mislukte geocode-poging (bijv. Nominatim tijdelijk niet
  // bereikbaar). Bij een ongewijzigd adres mét al bekende coördinaten
  // slaan we de aanroep over.
  const { data: existing } = await supabase
    .from("companies")
    .select("address, postal_code, city, latitude, longitude")
    .eq("id", companyId)
    .maybeSingle();

  const addressChanged =
    !existing ||
    existing.address !== (address || null) ||
    existing.postal_code !== (postalCode || null) ||
    existing.city !== (city || null);

  const missingCoordinates = existing?.latitude == null || existing?.longitude == null;

  const coordinates =
    addressChanged || missingCoordinates ? await geocodeAddress({ address, postalCode, city }) : undefined;

  const { error } = await supabase
    .from("companies")
    .update({
      name,
      tagline: tagline || null,
      description: description || null,
      industry: industry || null,
      website: website || null,
      city: city || null,
      address: address || null,
      postal_code: postalCode || null,
      phone: phone || null,
      email: email || null,
      linkedin_url: linkedinUrl || null,
      instagram_url: instagramUrl || null,
      facebook_url: facebookUrl || null,
      ...(logoPath ? { logo_url: logoPath } : {}),
      ...(coordinates !== undefined
        ? { latitude: coordinates?.latitude ?? null, longitude: coordinates?.longitude ?? null }
        : {}),
    })
    .eq("id", companyId);

  if (error) {
    return { error: "Opslaan is niet gelukt. Probeer het opnieuw." };
  }

  revalidatePath(`/bedrijven/${companyId}`);
  return { success: true };
}

// Goedkeuren/afwijzen mag door een bestaand lid van dit bedrijf of door
// bestuur/beheerder — company_membership_requests_decide_update (RLS) is de
// echte poortwachter hier; deze check is alleen voor een nette foutmelding.
export async function decideCompanyMembershipRequestAction(
  requestId: string,
  companyId: string,
  decision: "approved" | "rejected"
): Promise<{ error?: string }> {
  const profile = await requireProfile();
  const supabase = await createClient();

  const { error, count } = await supabase
    .from("company_membership_requests")
    .update({ status: decision, decided_by: profile.id }, { count: "exact" })
    .eq("id", requestId);

  if (error || !count) {
    return { error: "Afhandelen is niet gelukt. Probeer het opnieuw." };
  }

  revalidatePath(`/bedrijven/${companyId}`);
  return {};
}
