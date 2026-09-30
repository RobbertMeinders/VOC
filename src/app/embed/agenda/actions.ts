"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { isEmailRateLimited } from "@/lib/auth/rate-limit";

export type PublicRegisterState = { error?: string; success?: boolean };

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Publiek, geen account nodig — voor niet-leden die zich via de openbare
// website-embed aanmelden. Schrijft naar public_activity_registrations
// (0047_public_agenda_registration.sql), volledig los van de "echte"
// ledenaanmeldingen (activity_registrations): geen wachtlijst, geen
// koppeling aan een profiel. Nogmaals invullen met hetzelfde e-mailadres
// werkt als bijwerken, niet als foutmelding.
//
// Gaat via de upsert_public_activity_registration-RPC (security definer,
// 0060_restrict_cron_only_rpcs_and_registration_update.sql) i.p.v. losse
// insert/update-policies: de insert-of-update matcht daar atomisch binnen
// de database zelf op (activity_id, email), dus een aanroeper kan — ook
// rechtstreeks tegen de REST-API, buiten dit formulier om — onmogelijk een
// andere rij dan zijn eigen (activity_id, email)-combinatie raken. De
// eerdere opzet (losse insert-policy + update-policy met `using(true)`, want
// een bezoeker mag nooit zien wie zich al heeft aangemeld dus een SELECT-
// policy voor een echte upsert kon er niet zijn) liet zo'n aanroep in
// theorie wél de naam/bedrijfsnaam van een ANDERE aanmelding overschrijven.
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

  // Volledig anoniem bereikbaar (geen sessie nodig), dus zonder rate
  // limiting kon een script hier ongelimiteerd nepaanmeldingen insturen.
  // isEmailRateLimited faalt zelf "open" bij een onverwachte fout, dus dit
  // kan aanmelden nooit blokkeren (zie rate-limit.ts).
  if (await isEmailRateLimited("public_activity_registration", email)) {
    return { error: "Te veel pogingen met dit e-mailadres. Probeer het over een kwartier opnieuw." };
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("upsert_public_activity_registration", {
    p_activity_id: activityId,
    p_name: name,
    p_email: email,
    p_company_name: companyName,
  });

  if (error) {
    return { error: "Aanmelden is niet gelukt. Mogelijk staat deze activiteit niet (meer) open voor aanmelden." };
  }

  revalidatePath(`/embed/agenda/${activityId}`);
  return { success: true };
}
