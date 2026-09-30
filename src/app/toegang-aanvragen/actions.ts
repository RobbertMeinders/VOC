"use server";

import { createClient } from "@/lib/supabase/server";
import { isEmailRateLimited } from "@/lib/auth/rate-limit";

export type AccessRequestState = { error?: string; success?: boolean };

export async function submitAccessRequestAction(
  _prevState: AccessRequestState,
  formData: FormData
): Promise<AccessRequestState> {
  const firstName = String(formData.get("first_name") ?? "").trim();
  const lastName = String(formData.get("last_name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();
  const companyName = String(formData.get("company_name") ?? "").trim();
  const jobTitle = String(formData.get("job_title") ?? "").trim();
  const address = String(formData.get("address") ?? "").trim();
  const postalCode = String(formData.get("postal_code") ?? "").trim();
  const city = String(formData.get("city") ?? "").trim();
  const website = String(formData.get("website") ?? "").trim();
  const message = String(formData.get("message") ?? "").trim();
  const consent = formData.get("consent") === "on";

  if (!firstName || !lastName || !email) {
    return { error: "Vul je voornaam, achternaam en e-mailadres in." };
  }
  if (!consent) {
    return { error: "Ga akkoord met het bewaren van je gegevens om de aanvraag te versturen." };
  }

  // Volledig anoniem bereikbaar, dus zonder rate limiting kon een script
  // deze tabel (en de notificatie naar bestuur per aanvraag) ongelimiteerd
  // laten vollopen. Faalt zelf "open" bij een onverwachte fout (rate-limit.ts).
  if (await isEmailRateLimited("access_request_submitted", email)) {
    return { error: "Te veel aanvragen met dit e-mailadres. Probeer het over een kwartier opnieuw." };
  }

  const supabase = await createClient();
  // `name` blijft not null en gevuld — bestaande code (notificatietrigger,
  // beheerscherm) leest nog steeds dit ene veld.
  const { error } = await supabase.from("access_requests").insert({
    name: `${firstName} ${lastName}`,
    first_name: firstName,
    last_name: lastName,
    email,
    phone: phone || null,
    company_name: companyName || null,
    job_title: jobTitle || null,
    address: address || null,
    postal_code: postalCode || null,
    city: city || null,
    website: website || null,
    message: message || null,
    consent_at: new Date().toISOString(),
  });

  if (error) {
    return { error: `Versturen is niet gelukt: ${error.message}` };
  }

  return { success: true };
}
