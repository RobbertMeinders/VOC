"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { uploadImage } from "@/lib/supabase/upload";
import { isEmailRateLimited } from "@/lib/auth/rate-limit";

export type AccessRequestState = { error?: string; success?: boolean };

// Zelfde patroon als beheer/leden-import en embed/agenda. Zonder normaliseren
// (lowercase) omzeilde "Foo@Bar.nl" vs "foo@bar.nl" de e-mail-rate-limit
// hieronder bij elke net iets andere schrijfwijze van hetzelfde adres.
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function submitAccessRequestAction(
  _prevState: AccessRequestState,
  formData: FormData
): Promise<AccessRequestState> {
  const firstName = String(formData.get("first_name") ?? "").trim();
  const lastName = String(formData.get("last_name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const phone = String(formData.get("phone") ?? "").trim();
  const companyName = String(formData.get("company_name") ?? "").trim();
  const jobTitle = String(formData.get("job_title") ?? "").trim();
  const address = String(formData.get("address") ?? "").trim();
  const postalCode = String(formData.get("postal_code") ?? "").trim();
  const city = String(formData.get("city") ?? "").trim();
  const website = String(formData.get("website") ?? "").trim();
  const message = String(formData.get("message") ?? "").trim();
  const consent = formData.get("consent") === "on";
  const logoFile = formData.get("logo");
  const logoThumbFile = formData.get("logo_thumb");

  // Honeypot (AccessRequestForm.tsx): voor een mens onzichtbaar en niet
  // bereikbaar, dus alleen een script dat blind elk veld invult vult 'm.
  // Doet alsof het gelukt is — geen foutmelding die een bot laat weten dat
  // hij gedetecteerd is, en geen rij in de database.
  if (String(formData.get("company_fax") ?? "").trim() !== "") {
    return { success: true };
  }

  if (!firstName || !lastName || !email) {
    return { error: "Vul je voornaam, achternaam en e-mailadres in." };
  }
  if (!EMAIL_PATTERN.test(email)) {
    return { error: "Vul een geldig e-mailadres in." };
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
  const { data: inserted, error } = await supabase
    .from("access_requests")
    .insert({
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
    })
    .select("id")
    .single();

  if (error || !inserted) {
    // Tot nu toe ging de echte Postgres-foutmelding nergens heen — alleen
    // deze generieke tekst naar de bezoeker, dus geen enkel spoor om een
    // "versturen lukt niet"-melding ooit te kunnen verklaren. Komt nu in de
    // Vercel-functielogs terecht (console.error), net als elders in de app.
    console.error("[toegang-aanvragen] submitAccessRequestAction insert failed:", error);
    return { error: "Versturen is niet gelukt. Probeer het opnieuw." };
  }

  // D: logo meteen meesturen bij een nieuw bedrijf. De aanmelder is
  // anoniem/niet ingelogd en er bestaat op dit moment nog geen company_id om
  // de gewone company-logos-RLS (board-only insert, of per-lid scoped op een
  // bestaand bedrijf) te laten matchen — vandaar de service-role-client naar
  // een tijdelijke, aan deze aanvraag gebonden map. Puur best-effort: een
  // mislukte logo-upload mag de geslaagde aanvraag zelf nooit blokkeren.
  if (logoFile instanceof File && logoFile.size > 0) {
    try {
      const admin = createAdminClient();
      const folder = `pending/${inserted.id}`;
      const logoResult = await uploadImage(admin, "company-logos", folder, logoFile);
      if (!("error" in logoResult)) {
        let logoThumbPath: string | null = null;
        if (logoThumbFile instanceof File && logoThumbFile.size > 0) {
          const thumbResult = await uploadImage(admin, "company-logos", folder, logoThumbFile);
          if (!("error" in thumbResult)) logoThumbPath = thumbResult.path;
        }
        // Met de admin-client: access_requests heeft geen anon-update-policy
        // (alleen bestuur/beheer, zie access_requests_board_update), dus de
        // gewone sessie-client zou deze update stilletjes 0 rijen laten raken.
        await admin
          .from("access_requests")
          .update({ logo_path: logoResult.path, logo_thumb_path: logoThumbPath })
          .eq("id", inserted.id);
      }
    } catch (cause) {
      console.error("[toegang-aanvragen] logo-upload mislukt:", cause);
    }
  }

  return { success: true };
}
