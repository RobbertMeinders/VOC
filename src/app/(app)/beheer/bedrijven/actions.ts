"use server";

import { redirect } from "next/navigation";
import { requireBoard } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { invalidateQuery } from "@/lib/cache/queryCache";
import { logAuditAction } from "@/lib/audit/log";

export type CreateCompanyState = { error?: string };

// Zelfde slug-opbouw als de bulk-import (leden-import/actions.ts) — een
// verslugde naam plus een korte willekeurige staart, want twee bedrijven
// kunnen prima dezelfde naam-achtige slug willen (de kolom is uniek).
function slugify(name: string): string {
  const base = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
  return `${base}-${Math.random().toString(36).slice(2, 8)}`;
}

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
  const { data, error } = await supabase.from("companies").insert({ name, slug: slugify(name) }).select("id").single();

  if (error || !data) {
    return { error: "Aanmaken is niet gelukt. Probeer het opnieuw." };
  }

  invalidateQuery("bedrijven-page-data");
  invalidateQuery("beheer-bedrijven-page-data");
  await logAuditAction("company_created", "company", data.id);

  redirect(`/bedrijven/${data.id}/bewerken`);
}
