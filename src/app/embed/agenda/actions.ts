"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { invalidateActivityStatsCache } from "@/lib/statistics/shared";
import { isEmailRateLimited, isIpRateLimited } from "@/lib/auth/rate-limit";
import { getClientIp } from "@/lib/http/client-ip";
import { sendInvitationTemplateEmail, type InvitationSource } from "@/lib/invitations/email";
import { isEmailConfigured, sendRawHtmlEmail, invitationGreeting } from "@/lib/email/send";
import { renderMessageEmail } from "@/lib/templates/message-render";
import { formatActivityDate } from "@/lib/format/date";
import { buildUnsubscribeUrl } from "@/lib/newsletter/unsubscribe";

// Personenmodel Fase 2: of het ingevulde e-mailadres exact overeenkomt met
// een bestaand lid ("lid"), een openstaande uitnodiging ("lid_zonder_
// account") of niemand bekend ("geen_lid") -- bepaalt de bedankttekst
// hieronder in PublicRegistrationForm.
export type PersonMatchStatus = "lid" | "lid_zonder_account" | "geen_lid";

export type PublicRegisterState = {
  error?: string;
  success?: boolean;
  personStatus?: PersonMatchStatus;
  waitlisted?: boolean;
};

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Publiek, geen account nodig — voor wie zich via de openbare website-embed
// aanmeldt, lid of niet. Schrijft naar public_activity_registrations
// (0047_public_agenda_registration.sql) voor een echte buitenstaander of een
// lid-zonder-account, los van de "echte" ledenaanmeldingen
// (activity_registrations). Matcht het ingevulde e-mailadres exact met een
// bestaand profiel, dan gaat de RPC zelf (0211) naar die échte tabel i.p.v.
// hier -- zie upsert_public_activity_registration. Nogmaals invullen met
// HETZELFDE e-mailadres EN dezelfde naam/bedrijfsnaam is een stille no-op
// (bv. een dubbelklik); met een ANDERE naam/bedrijfsnaam geeft het sinds
// VOC-07 een foutmelding i.p.v. de bestaande aanmelding stil te
// overschrijven — wie het e-mailadres van een ander weet/raadt kon anders
// diens naam/bedrijfsnaam wijzigen. Zelf een typefout herstellen kan dus
// niet meer zonder contact met het bestuur (bewuste afweging, zie het
// gesprek hierover).
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
  const { data: upsertResult, error } = await supabase
    .rpc("upsert_public_activity_registration", {
      p_activity_id: activityId,
      p_name: name,
      p_email: email,
      p_company_name: companyName,
    })
    .single();

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
  revalidatePath("/agenda");

  // Personenmodel: upsert_public_activity_registration (0211) herkent het
  // e-mailadres nu zelf en meldt een "lid" meteen écht aan (activity_
  // registrations, met wachtlijst) -- person_status/waitlisted komen dus al
  // mee terug uit die ene aanroep. Voor "lid_zonder_account" is er daarnaast
  // nog een losse match_person_by_email-aanroep nodig voor het
  // uitnodigingstoken (om dezelfde uitnodigingsmail nogmaals te sturen) --
  // nooit de bedankmelding laten mislukken op die extra stap: een fout hier
  // is nooit ernstiger dan "geen nudge verstuurd", de aanmelding zelf staat
  // al vast.
  const personStatus: PersonMatchStatus = (upsertResult?.person_status as PersonMatchStatus) ?? "geen_lid";
  const waitlisted = Boolean(upsertResult?.waitlisted);
  if (personStatus === "lid") {
    // Zelfde reden als registerForActivityAction (agenda/actions.ts): anders
    // bleef Statistieken > Activiteiten tot 60s een verouderd aantal tonen.
    invalidateActivityStatsCache();
  }
  if (personStatus === "lid_zonder_account") {
    try {
      const { data: match } = await supabase.rpc("match_person_by_email", { p_email: email }).maybeSingle();
      if (match?.invitation_token) {
        await sendInvitationTemplateEmail(
          (match.invitation_source ?? "nieuw_lid") as InvitationSource,
          email,
          match.invitation_token,
          match.invitation_first_name
        );
      }
    } catch {
      // Zie toelichting hierboven -- de aanmelding is al gelukt.
    }
  }

  // Fase 3: eenvoudige bevestigingsmail na elke publieke aanmelding, met
  // een status-afhankelijke extra zin en altijd een link om deze specifieke
  // aanmelding weer in te trekken (buildUnsubscribeUrl, kind
  // "public_registration" -- verwijdert alleen deze rij, geen nieuwsbrief-
  // voorkeur). Geen losse herinneringsmail vooraf, bewust: dit is de enige
  // mail die een publieke aanmelder krijgt. Ook hier geldt: nooit de
  // bedankmelding laten mislukken op een fout in deze extra stap.
  try {
    const siteUrl = process.env.SITE_URL ?? "";
    // public_activity_registrations is zelf alleen leesbaar voor bestuur
    // (RLS) -- get_public_registration_id (0210) geeft alleen het eigen
    // rij-id terug voor precies dit (activity_id, email)-paar.
    const [{ data: activity }, { data: registrationId }] = await Promise.all([
      supabase.from("activities").select("title, starts_at").eq("id", activityId).maybeSingle(),
      supabase.rpc("get_public_registration_id", { p_activity_id: activityId, p_email: email }),
    ]);

    if (activity && registrationId && isEmailConfigured()) {
      const extra =
        personStatus === "lid_zonder_account"
          ? "Je hebt ook een openstaande uitnodiging voor het ledenportaal - we hebben die net opnieuw naar je gemaild."
          : personStatus === "geen_lid"
            ? "Benieuwd naar de VOC? Op vocveendam.nl lees je meer over het lidmaatschap."
            : "";
      const [firstName] = name.trim().split(/\s+/);
      const afmeldlink = buildUnsubscribeUrl(siteUrl, "public_registration", registrationId);
      const rendered = await renderMessageEmail(
        "aanmelding-bevestiging",
        `${siteUrl.replace(/\/$/, "")}/embed/agenda/${activityId}`,
        {
          greeting: invitationGreeting(firstName ?? null),
          title: activity.title,
          datum: formatActivityDate(activity.starts_at),
          extra,
          afmeldlink,
        }
      );
      if (rendered) {
        await sendRawHtmlEmail(email, rendered.subject, rendered.html, rendered.text);
      }
    }
  } catch {
    // Zie toelichting hierboven -- de aanmelding is al gelukt.
  }

  return { success: true, personStatus, waitlisted };
}
