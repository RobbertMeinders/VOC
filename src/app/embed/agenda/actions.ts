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
// werkt als bijwerken, niet als foutmelding.
//
// Bewust géén .upsert(): Postgres vereist voor INSERT ... ON CONFLICT DO
// UPDATE dat de rol ook een SELECT-policy heeft om de botsende rij te
// kunnen vinden — die is er hier bewust niet (een bezoeker mag nooit zien
// wie zich al heeft aangemeld, alleen het bestuur). Daardoor faalde zelfs
// de allereerste, unieke aanmelding al met een RLS-fout. Los, gewoon
// INSERT proberen en bij een unique-violation (23505) een losse UPDATE
// doen — die heeft alleen de eigen update-policy nodig, geen SELECT.
export async function registerPublicForActivityAction(
  activityId: string,
  _prevState: PublicRegisterState,
  formData: FormData
): Promise<PublicRegisterState> {
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const companyName = String(formData.get("company_name") ?? "").trim();

  if (!name || !email || !companyName) {
    return { error: "Naam, e-mailadres en bedrijfsnaam zijn verplicht." };
  }
  if (!EMAIL_PATTERN.test(email)) {
    return { error: "Vul een geldig e-mailadres in." };
  }

  const supabase = await createClient();
  const row = { activity_id: activityId, name, email, company_name: companyName };
  const { error: insertError } = await supabase.from("public_activity_registrations").insert(row);

  if (insertError?.code === "23505") {
    const { error: updateError } = await supabase
      .from("public_activity_registrations")
      .update({ name, company_name: companyName })
      .eq("activity_id", activityId)
      .eq("email", email);
    if (updateError) {
      return { error: "Aanmelden is niet gelukt. Probeer het opnieuw." };
    }
  } else if (insertError) {
    // De insert-policy wijst een activiteit af die niet (meer) goedgekeurd
    // is of geen publieke aanmelding toestaat — dat komt hier als een RLS-
    // fout binnen, niet als een duidelijke boodschap.
    return { error: "Aanmelden is niet gelukt. Mogelijk staat deze activiteit niet (meer) open voor aanmelden." };
  }

  revalidatePath(`/embed/agenda/${activityId}`);
  return { success: true };
}
