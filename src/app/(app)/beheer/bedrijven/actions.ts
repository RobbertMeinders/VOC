"use server";

import { redirect } from "next/navigation";
import { requireBoard } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { invalidateQuery } from "@/lib/cache/queryCache";
import { logAuditAction } from "@/lib/audit/log";
import { companyHref } from "@/lib/company/slug";

export type CreateCompanyState = { error?: string };

// Maakt bewust alleen een kale rij aan (naam + gegenereerde slug) i.p.v. een
// volledig formulier hier te dupliceren — stuurt daarna meteen door naar de
// bestaande bewerkpagina, die via CompanyForm alle overige velden al
// afhandelt (logo, adres, social links, ...).
export async function createCompanyAction(
  _prevState: CreateCompanyState,
  formData: FormData
): Promise<CreateCompanyState> {
  await requireBoard();

  const name = String(formData.get("name") ?? "").trim();
  if (!name) {
    return { error: "Bedrijfsnaam is verplicht." };
  }

  const supabase = await createClient();
  // generate_unique_company_slug (0161): kale geslugde naam, alleen bij een
  // échte botsing een oplopend "-2"/"-3" — i.p.v. de vroegere willekeurige
  // staart, die /bedrijven/<naam>-<id> onnodig lelijk maakte.
  const { data: slug, error: slugError } = await supabase.rpc("generate_unique_company_slug", { p_name: name });
  if (slugError || !slug) {
    return { error: "Aanmaken is niet gelukt. Probeer het opnieuw." };
  }
  const { data, error } = await supabase.from("companies").insert({ name, slug }).select("id").single();

  if (error || !data) {
    return { error: "Aanmaken is niet gelukt. Probeer het opnieuw." };
  }

  invalidateQuery("bedrijven-page-data");
  invalidateQuery("beheer-bedrijven-page-data");
  await logAuditAction("company_created", "company", data.id);

  redirect(companyHref({ slug }, "/bewerken"));
}
