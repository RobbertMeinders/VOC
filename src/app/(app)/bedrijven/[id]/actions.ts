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

  // Alleen opnieuw geocoderen (Nominatim-aanroep) als het adres echt
  // wijzigde — niet bij elke opslag, ook al betreft die alleen bijv. de
  // tagline.
  const { data: existing } = await supabase
    .from("companies")
    .select("address, postal_code, city")
    .eq("id", companyId)
    .maybeSingle();

  const addressChanged =
    !existing ||
    existing.address !== (address || null) ||
    existing.postal_code !== (postalCode || null) ||
    existing.city !== (city || null);

  const coordinates = addressChanged ? await geocodeAddress({ address, postalCode: postalCode, city }) : undefined;

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
