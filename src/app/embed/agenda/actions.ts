"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type PublicRegisterState = { error?: string; success?: boolean };

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Publiek, geen account nodig — voor niet-leden die zich via de openbare
// website-embed aanmelden. Schrijft naar public_activity_registrations
// (0047_public_agenda_registration.sql), volledig los van de "echte"
// ledenaanmeldingen (activity_registrations): geen wachtlijst, geen
// koppeling aan een profiel. Nogmaals invullen met hetzelfde e-mailadres
// werkt als bijwerken (upsert), niet als foutmelding — zie de RLS-policy's
// in diezelfde migratie voor de onderbouwing.
export async function registerPublicForActivityAction(
  activityId: string,
  _prevState: PublicRegisterState,
  formData: FormData
): Promise<PublicRegisterState> {
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const companyName = String(formData.get("company_name") ?? "").trim();

  if (!name || !email) {
    return { error: "Naam en e-mailadres zijn verplicht." };
  }
  if (!EMAIL_PATTERN.test(email)) {
    return { error: "Vul een geldig e-mailadres in." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("public_activity_registrations")
    .upsert({ activity_id: activityId, name, email, company_name: companyName || null }, { onConflict: "activity_id,email" });

  if (error) {
    // De insert-policy wijst een activiteit af die niet (meer) goedgekeurd
    // is of geen publieke aanmelding toestaat — dat komt hier als een RLS-
    // fout binnen, niet als een duidelijke boodschap.
    return { error: "Aanmelden is niet gelukt. Mogelijk staat deze activiteit niet (meer) open voor aanmelden." };
  }

  revalidatePath(`/embed/agenda/${activityId}`);
  return { success: true };
}
