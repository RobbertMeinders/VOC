"use server";

import { revalidatePath } from "next/cache";
import { requireBoard } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { uploadImage } from "@/lib/supabase/upload";

export type UpdateCompanyState = { error?: string; success?: boolean };

export async function updateCompanyAction(
  companyId: string,
  _prevState: UpdateCompanyState,
  formData: FormData
): Promise<UpdateCompanyState> {
  await requireBoard();

  const name = String(formData.get("name") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const industry = String(formData.get("industry") ?? "").trim();
  const website = String(formData.get("website") ?? "").trim();
  const city = String(formData.get("city") ?? "").trim();

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

  const { error } = await supabase
    .from("companies")
    .update({
      name,
      description: description || null,
      industry: industry || null,
      website: website || null,
      city: city || null,
      ...(logoPath ? { logo_url: logoPath } : {}),
    })
    .eq("id", companyId);

  if (error) {
    return { error: "Opslaan is niet gelukt. Probeer het opnieuw." };
  }

  revalidatePath(`/bedrijven/${companyId}`);
  return { success: true };
}
