"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { isEmailRateLimited, isIpRateLimited } from "@/lib/auth/rate-limit";
import { getClientIp } from "@/lib/http/client-ip";
import { sendInvitationTemplateEmail, type InvitationSource } from "@/lib/invitations/email";

// Personenmodel Fase 2: of het ingevulde e-mailadres exact overeenkomt met
// een bestaand lid ("lid"), een openstaande uitnodiging ("lid_zonder_
// account") of niemand bekend ("geen_lid") -- bepaalt de bedankttekst
// hieronder in PublicRegistrationForm.
export type PersonMatchStatus = "lid" | "lid_zonder_account" | "geen_lid";

export type PublicRegisterState = { error?: string; success?: boolean; personStatus?: PersonMatchStatus };

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Publiek, geen account nodig — voor niet-leden die zich via de openbare
// website-embed aanmelden. Schrijft naar public_activity_registrations
// (0047_public_agenda_registration.sql), volledig los van de "echte"
// ledenaanmeldingen (activity_registrations): geen wachtlijst, geen
// koppeling aan een profiel. Nogmaals invullen met HETZELFDE e-mailadres
// EN dezelfde naam/bedrijfsnaam is een stille no-op (bv. een dubbelklik);
// met een ANDERE naam/bedrijfsnaam geeft het sinds VOC-07 een foutmelding
// i.p.v. de bestaande aanmelding stil te overschrijven — wie het
// e-mailadres van een ander weet/raadt kon anders diens naam/bedrijfsnaam
// wijzigen. Zelf een typefout herstellen kan dus niet meer zonder contact
// met het bestuur (bewuste afweging, zie het gesprek hierover).
//
// Gaat via de upsert_public_activity_registration-RPC (security definer,
// 0060_restrict_cron_only_rpcs_and_registration_update.sql, VOC-07-fix in
// 0204) i.p.v. losse insert/update-policies: de hele operatie gebeurt
// atomisch binnen de database zelf, dus een aanroeper kan — ook
// rechtstreeks tegen de REST-API, buiten dit formulier om — nooit een
// andere rij raken dan zijn eigen (activity_id, email)-combinatie, en nooit
// een bestaande rij met een afwijkende naam overschrijven.
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
  // kan aanmelden nooit blokkeren (zie rate-limit.ts). Los daarvan ook op
  // IP gelimiteerd — alleen op e-mailadres limiteren laat een aanvaller
  // het maximum aantal deelnemers nog steeds vol laten lopen door telkens
  // een ander (verzonnen) e-mailadres te gebruiken.
  if (await isEmailRateLimited("public_activity_registration", email)) {
    return { error: "Te veel pogingen met dit e-mailadres. Probeer het over een kwartier opnieuw." };
  }
  if (await isIpRateLimited("public_activity_registration", await getClientIp())) {
    return { error: "Te veel pogingen vanaf dit apparaat. Probeer het over een kwartier opnieuw." };
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("upsert_public_activity_registration", {
    p_activity_id: activityId,
    p_name: name,
    p_email: email,
    p_company_name: companyName,
  });

  if (error) {
    // F6: upsert_public_activity_registration (0099, rate limiting in 0119)
    // bewaakt nu ook deadline, maximum en pogingen-per-e-mailadres, met een
    // eigen duidelijke foutmelding per geval — die mag hier getoond worden
    // (geen interne details, gewoon leesbare NL-tekst). Alles daarbuiten
    // blijft de algemene melding, om nooit een rauwe databasefout te laten
    // zien.
    const KNOWN_MESSAGES = [
      "De aanmelddeadline voor deze activiteit is verstreken.",
      "Deze activiteit heeft het maximum aantal deelnemers bereikt.",
      "Te veel pogingen met dit e-mailadres. Probeer het over een kwartier opnieuw.",
      "Er staat al een aanmelding met dit e-mailadres voor deze activiteit. Neem contact op met het bestuur als dit niet klopt.",
    ];
    return {
      error: KNOWN_MESSAGES.includes(error.message)
        ? error.message
        : "Aanmelden is niet gelukt. Mogelijk staat deze activiteit niet (meer) open voor aanmelden.",
    };
  }

  revalidatePath(`/embed/agenda/${activityId}`);

  // Personenmodel Fase 2: exacte e-mailmatch tegen bekende personen (RPC
  // match_person_by_email, 0209) -- bij een match met een openstaande
  // uitnodiging stuurt de RPC meteen de velden terug om diezelfde
  // uitnodigingsmail nogmaals te sturen (nudge). Nooit de bedankmelding
  // laten mislukken op deze extra stap: een fout hier is nooit ernstiger
  // dan "geen nudge verstuurd", de aanmelding zelf staat al vast.
  let personStatus: PersonMatchStatus = "geen_lid";
  try {
    const { data: match } = await supabase.rpc("match_person_by_email", { p_email: email }).maybeSingle();
    if (match) {
      personStatus = match.status as PersonMatchStatus;
      if (match.status === "lid_zonder_account" && match.invitation_token) {
        await sendInvitationTemplateEmail(
          (match.invitation_source ?? "nieuw_lid") as InvitationSource,
          email,
          match.invitation_token,
          match.invitation_first_name
        );
      }
    }
  } catch {
    // Zie toelichting hierboven -- de aanmelding is al gelukt.
  }

  return { success: true, personStatus };
}
