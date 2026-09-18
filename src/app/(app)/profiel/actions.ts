"use server";

import { revalidatePath } from "next/cache";
import { requireProfile } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { uploadImage } from "@/lib/supabase/upload";

export type UpdateProfileState = { error?: string; success?: boolean };

export async function updateProfileAction(
  _prevState: UpdateProfileState,
  formData: FormData
): Promise<UpdateProfileState> {
  const profile = await requireProfile();

  const firstName = String(formData.get("first_name") ?? "").trim();
  const lastName = String(formData.get("last_name") ?? "").trim();
  const jobTitle = String(formData.get("job_title") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();
  const website = String(formData.get("website") ?? "").trim();
  const showEmail = formData.get("show_email") === "on";
  const showPhone = formData.get("show_phone") === "on";

  if (!firstName || !lastName) {
    return { error: "Voor- en achternaam zijn verplicht." };
  }

  const supabase = await createClient();

  let avatarPath: string | undefined;
  const avatarFile = formData.get("avatar");
  if (avatarFile instanceof File && avatarFile.size > 0) {
    const result = await uploadImage(supabase, "avatars", profile.id, avatarFile);
    if ("error" in result) return { error: result.error };
    avatarPath = result.path;
  }

  const { error } = await supabase
    .from("profiles")
    .update({
      first_name: firstName,
      last_name: lastName,
      job_title: jobTitle || null,
      phone: phone || null,
      website: website || null,
      show_email: showEmail,
      show_phone: showPhone,
      ...(avatarPath ? { avatar_url: avatarPath } : {}),
    })
    .eq("id", profile.id);

  if (error) {
    return { error: "Opslaan is niet gelukt. Probeer het opnieuw." };
  }

  revalidatePath("/profiel");
  return { success: true };
}

export type ChangeEmailState = { error?: string; success?: boolean };

export async function changeEmailAction(_prevState: ChangeEmailState, formData: FormData): Promise<ChangeEmailState> {
  await requireProfile();
  const email = String(formData.get("email") ?? "").trim();

  if (!email) {
    return { error: "Vul een e-mailadres in." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ email });

  if (error) {
    return { error: `Wijzigen is niet gelukt: ${error.message}` };
  }

  return { success: true };
}

export type UpdateCompanyMembershipState = { error?: string; success?: boolean };

function slugify(name: string, suffix: string): string {
  return `${name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "")}-${suffix}`;
}

export async function updateMyCompanyAction(
  _prevState: UpdateCompanyMembershipState,
  formData: FormData
): Promise<UpdateCompanyMembershipState> {
  const profile = await requireProfile();
  const companyMode = String(formData.get("company_mode") ?? "existing");
  const companyId = String(formData.get("company_id") ?? "").trim();
  const newCompanyName = String(formData.get("new_company_name") ?? "").trim();
  const newCompanyIndustry = String(formData.get("new_company_industry") ?? "").trim();
  const newCompanyCity = String(formData.get("new_company_city") ?? "").trim();
  const newCompanyWebsite = String(formData.get("new_company_website") ?? "").trim();

  if (companyMode === "existing" && !companyId) {
    return { error: "Zoek en selecteer je bedrijf, of maak een nieuw bedrijf aan." };
  }
  if (companyMode === "new" && !newCompanyName) {
    return { error: "Vul de bedrijfsnaam in." };
  }

  const supabase = await createClient();
  let targetCompanyId = companyId;

  if (companyMode === "new") {
    const { data: newCompany, error } = await supabase
      .from("companies")
      .insert({
        name: newCompanyName,
        slug: slugify(newCompanyName, profile.id.slice(0, 8)),
        industry: newCompanyIndustry || null,
        city: newCompanyCity || null,
        website: newCompanyWebsite || null,
      })
      .select("id")
      .single();

    if (error || !newCompany) {
      return { error: "Bedrijf aanmaken is niet gelukt. Probeer het opnieuw." };
    }
    targetCompanyId = newCompany.id;
  }

  // A member has one primary company in this UI — drop any existing link first.
  await supabase.from("company_members").delete().eq("profile_id", profile.id);

  const { error: linkError } = await supabase
    .from("company_members")
    .insert({ company_id: targetCompanyId, profile_id: profile.id, is_primary: true });

  if (linkError) {
    return { error: "Koppelen aan het bedrijf is niet gelukt. Probeer het opnieuw." };
  }

  revalidatePath("/profiel");
  return { success: true };
}
