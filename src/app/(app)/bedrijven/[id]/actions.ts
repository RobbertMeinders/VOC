"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin, requireBoard, requireProfile } from "@/lib/auth/session";
import { isBoard } from "@/lib/auth/roles";
import { createClient } from "@/lib/supabase/server";
import { removePreviousImage, uploadImage } from "@/lib/supabase/upload";
import { geocodeAddress } from "@/lib/geo/geocode";
import { invalidateQuery } from "@/lib/cache/queryCache";
import { logAuditAction } from "@/lib/audit/log";
import { isEmailConfigured, sendRawHtmlEmail, invitationGreeting } from "@/lib/email/send";
import { renderMessageEmail } from "@/lib/templates/message-render";
import { companyHref } from "@/lib/company/slug";
import { buildCancellationConfirmUrl } from "@/lib/company/cancellation-link";
import type { Database } from "@/lib/types/database";

// URL-ronde: revalidatePath() matcht het exacte pad, geen routepatroon — nu
// bedrijven op slug-URL's draaien, revalideert een pad met het kale UUID de
// daadwerkelijk gerenderde route niet meer. Gebruikt waar de aanroepende
// functie de slug niet al zelf heeft opgehaald; valt terug op het UUID-pad
// als de rij onverwacht niet (meer) bestaat, zodat dit nooit crasht.
async function getCompanySlugPath(
  supabase: Awaited<ReturnType<typeof createClient>>,
  companyId: string,
  suffix = ""
): Promise<string> {
  const { data } = await supabase.from("companies").select("slug").eq("id", companyId).maybeSingle();
  return data?.slug ? companyHref({ slug: data.slug }, suffix) : `/bedrijven/${companyId}${suffix}`;
}

export type UpdateCompanyState = { error?: string; success?: boolean };

export async function updateCompanyAction(
  companyId: string,
  _prevState: UpdateCompanyState,
  formData: FormData
): Promise<UpdateCompanyState> {
  const profile = await requireProfile();
  const supabase = await createClient();

  // Bedrijfsgegevens bewerken was tot nu toe bestuur/beheer-only; elk
  // gekoppeld lid mag dat nu ook, voor het eigen bedrijf. Check hier vooraf
  // (i.p.v. alleen op de companies_member_update RLS-policy leunen) om de
  // geocode-aanroep en logo-upload verderop over te slaan voor een
  // niet-gerechtigde aanroep, en om een duidelijke foutmelding te geven.
  if (!isBoard(profile.role)) {
    const { count } = await supabase
      .from("company_members")
      .select("id", { count: "exact", head: true })
      .eq("company_id", companyId)
      .eq("profile_id", profile.id);
    if (!count) {
      return { error: "Je hebt geen rechten om dit bedrijf te bewerken." };
    }
  }

  const name = String(formData.get("name") ?? "").trim();
  const tagline = String(formData.get("tagline") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const industry = String(formData.get("industry") ?? "").trim();
  const website = String(formData.get("website") ?? "").trim();
  const city = String(formData.get("city") ?? "").trim();
  const address = String(formData.get("address") ?? "").trim();
  const postalCode = String(formData.get("postal_code") ?? "").trim();
  const showAddress = formData.get("show_address") === "on";
  const isPubliclyVisible = formData.get("is_publicly_visible") === "on";
  const phone = String(formData.get("phone") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const linkedinUrl = String(formData.get("linkedin_url") ?? "").trim();
  const instagramUrl = String(formData.get("instagram_url") ?? "").trim();
  const facebookUrl = String(formData.get("facebook_url") ?? "").trim();

  if (!name) {
    return { error: "Bedrijfsnaam is verplicht." };
  }

  let logoPath: string | undefined;
  // undefined = geen nieuw logo, dus kolom ongemoeid laten; null = wel een
  // nieuw logo maar geen (geslaagde) thumbnail ervoor (bv. SVG) — dan
  // expliciet leegmaken, anders zou een oude thumbnail bij een nieuw logo
  // blijven staan.
  let logoThumbPath: string | null | undefined;
  const logoFile = formData.get("logo");
  if (logoFile instanceof File && logoFile.size > 0) {
    const result = await uploadImage(supabase, "company-logos", companyId, logoFile);
    if ("error" in result) return { error: result.error };
    logoPath = result.path;

    logoThumbPath = null;
    const logoThumbFile = formData.get("logo_thumb");
    if (logoThumbFile instanceof File && logoThumbFile.size > 0) {
      const thumbResult = await uploadImage(supabase, "company-logos", companyId, logoThumbFile);
      if (!("error" in thumbResult)) logoThumbPath = thumbResult.path;
    }
  }

  // Opnieuw geocoderen (Nominatim-aanroep) als het adres wijzigde, of als
  // er nog helemaal geen coördinaten bekend zijn — dat laatste vangt zowel
  // bedrijven die vóór deze functie al een adres hadden ingevuld, als een
  // eerdere mislukte geocode-poging (bijv. Nominatim tijdelijk niet
  // bereikbaar). Bij een ongewijzigd adres mét al bekende coördinaten
  // slaan we de aanroep over.
  // companies_for_members (M8, sinds 0158 een security definer functie
  // i.p.v. view — Supabase-linter 0010): deze aanroeper is hierboven al als
  // company-lid of bestuur/beheer geverifieerd, dus krijgt sowieso het
  // ongemaskeerde adres terug — maar de kolom-grant op companies zelf is
  // nu dicht voor authenticated, dus moet via deze functie gelezen worden.
  const { data: existing } = await supabase
    .rpc("companies_for_members")
    .select("address, postal_code, city, latitude, longitude, logo_url, logo_thumb_url, slug")
    .eq("id", companyId)
    .maybeSingle();

  const addressChanged =
    !existing ||
    existing.address !== (address || null) ||
    existing.postal_code !== (postalCode || null) ||
    existing.city !== (city || null);

  const missingCoordinates = existing?.latitude == null || existing?.longitude == null;

  const coordinates =
    addressChanged || missingCoordinates ? await geocodeAddress({ address, postalCode, city }) : undefined;

  // Alleen écht null wegschrijven als er geen adres meer is om op te
  // geocoderen — bij een mislukte poging (Nominatim tijdelijk onbereikbaar,
  // rate-limit, geen resultaat) terwijl er wél een adres staat, blijven de
  // bestaande coördinaten gewoon staan i.p.v. ze stilletjes te wissen. Zonder
  // dit zou een voorbijgaande hik bij Nominatim een tot dan toe correct op de
  // kaart staand bedrijf er zomaar af kunnen laten verdwijnen.
  const addressCleared = !address && !city;
  const coordinateUpdate =
    coordinates !== undefined
      ? coordinates
        ? { latitude: coordinates.latitude, longitude: coordinates.longitude }
        : addressCleared
          ? { latitude: null, longitude: null }
          : {}
      : {};

  const { error, count } = await supabase
    .from("companies")
    .update(
      {
        name,
        tagline: tagline || null,
        description: description || null,
        industry: industry || null,
        website: website || null,
        city: city || null,
        address: address || null,
        postal_code: postalCode || null,
        show_address: showAddress,
        is_publicly_visible: isPubliclyVisible,
        phone: phone || null,
        email: email || null,
        linkedin_url: linkedinUrl || null,
        instagram_url: instagramUrl || null,
        facebook_url: facebookUrl || null,
        ...(logoPath ? { logo_url: logoPath, logo_thumb_url: logoThumbPath } : {}),
        ...coordinateUpdate,
      },
      { count: "exact" }
    )
    .eq("id", companyId);

  // count=0 zonder error betekent dat de companies_member_update/
  // companies_board_update RLS-policies de rij stilletjes niet matchten
  // (Postgrest geeft daar geen fout voor terug) — de check hierboven vangt
  // dit al af vóór de geocode/upload, dit is alleen een achtervang tegen een
  // lidmaatschap dat precies tussendoor is ingetrokken.
  if (error || !count) {
    return { error: "Opslaan is niet gelukt. Probeer het opnieuw." };
  }

  if (logoPath) {
    await removePreviousImage(supabase, "company-logos", existing?.logo_url);
    await removePreviousImage(supabase, "company-logos", existing?.logo_thumb_url);
  }

  await logAuditAction("company_updated", "company", companyId);

  // Naam/branche/logo van dit bedrijf staan ook in de bedrijven- en
  // ledenlijst (die het bedrijf van elk lid meestuurt) — beide invalideren.
  invalidateQuery("bedrijven-page-data");
  invalidateQuery("leden-page-data");
  invalidateQuery("beheer-bedrijven-page-data");
  revalidatePath(existing?.slug ? companyHref({ slug: existing.slug }) : `/bedrijven/${companyId}`);
  return { success: true };
}

export type QuickUpdateCompanyState = { error?: string; success?: boolean };

// Smalle tegenhanger van updateCompanyAction, voor het "snel bewerken"-
// paneel in Beheer -> Bedrijven (Overzicht): alleen de velden die daar
// zichtbaar zijn. Bewust GEEN hergebruik van updateCompanyAction met een
// gedeeltelijk formulier — die schrijft élk veld uit formData weg (incl.
// een leeg veld als null), dus een formulier zonder bv. tagline/
// omschrijving/adres/socials zou die bij elke snelle wijziging stilletjes
// leegmaken. Deze actie raakt uitsluitend de hieronder genoemde kolommen;
// voor adres/logo/omschrijving/socials/zichtbaarheid blijft het volledige
// bewerkformulier (/bedrijven/[id]/bewerken) de plek.
export async function quickUpdateCompanyAction(
  companyId: string,
  _prevState: QuickUpdateCompanyState,
  formData: FormData
): Promise<QuickUpdateCompanyState> {
  await requireBoard();
  const supabase = await createClient();

  const name = String(formData.get("name") ?? "").trim();
  if (!name) {
    return { error: "Bedrijfsnaam is verplicht." };
  }

  const membershipStatus = String(formData.get("membership_status") ?? "").trim();
  const MEMBERSHIP_STATUSES = ["prospect", "lid", "opgezegd", "oud-lid"] as const;
  const validStatus = MEMBERSHIP_STATUSES.find((s) => s === membershipStatus);

  const { data, error, count } = await supabase
    .from("companies")
    .update(
      {
        name,
        industry: String(formData.get("industry") ?? "").trim() || null,
        city: String(formData.get("city") ?? "").trim() || null,
        phone: String(formData.get("phone") ?? "").trim() || null,
        email: String(formData.get("email") ?? "").trim() || null,
        website: String(formData.get("website") ?? "").trim() || null,
        ...(validStatus ? { membership_status: validStatus } : {}),
      },
      { count: "exact" }
    )
    .eq("id", companyId)
    .select("slug");

  if (error || !count) {
    return { error: "Opslaan is niet gelukt. Probeer het opnieuw." };
  }

  await logAuditAction("company_updated", "company", companyId);

  invalidateQuery("bedrijven-page-data");
  invalidateQuery("leden-page-data");
  invalidateQuery("beheer-bedrijven-page-data");
  revalidatePath(data?.[0]?.slug ? companyHref({ slug: data[0].slug }) : `/bedrijven/${companyId}`);
  return { success: true };
}

// Standalone tegenhanger van het schuifje in CompanyForm — dezelfde kolom,
// maar los aan te zetten vanaf de instellingenpagina, dus permissie is
// ruimer dan updateCompanyAction (dat volledige bedrijfsbeheer is,
// bestuur/beheer-only): bestuur/beheer, of gewoon een lid van dit bedrijf
// zelf — die kent het bezoekersadres het beste en is precies wie hier vaak
// een privéadres heeft staan. companies_board_update (RLS) staat een gewoon
// lid geen UPDATE op companies toe, dus dit gaat via de
// set_company_show_address-RPC (0036_company_show_address.sql), die zijn
// eigen (ruimere, maar tot deze ene kolom beperkte) autorisatiecheck doet.
export async function updateCompanyShowAddressAction(companyId: string, visible: boolean): Promise<{ error?: string }> {
  await requireProfile();
  const supabase = await createClient();

  const { error } = await supabase.rpc("set_company_show_address", {
    p_company_id: companyId,
    p_visible: visible,
  });

  if (error) {
    return { error: "Wijzigen is niet gelukt. Probeer het opnieuw." };
  }
  invalidateQuery("bedrijven-page-data");
  revalidatePath(await getCompanySlugPath(supabase, companyId));
  revalidatePath("/profiel");
  return {};
}

// Lidmaatschap-traject Deel 3: "niet nu" op de adres-zichtbaarheid-prompt
// (AddressVisibilityPrompt, bedrijfspagina) — via dismiss_company_address_prompt
// (0180), zelfde smalle-functie-aanpak als set_company_show_address hierboven.
export async function dismissCompanyAddressPromptAction(companyId: string): Promise<{ error?: string }> {
  await requireProfile();
  const supabase = await createClient();

  const { error } = await supabase.rpc("dismiss_company_address_prompt", { p_company_id: companyId });

  if (error) {
    return { error: "Wegklikken is niet gelukt. Probeer het opnieuw." };
  }
  revalidatePath(await getCompanySlugPath(supabase, companyId));
  return {};
}

// Alleen beheerder — RLS (companies_admin_delete) is de echte grens, dit is
// alleen voor een nette foutmelding. Company_members/-requests hangen via
// on delete cascade aan companies, dus die ruimt de database vanzelf op.
// redirectAfter=true (standaard) is voor de bewerkpagina, waar het bedrijf
// na verwijderen niet meer bestaat; false is voor de beheerlijst, die na
// verwijderen gewoon op dezelfde plek moet blijven met de rij eruit.
export async function deleteCompanyAction(companyId: string, redirectAfter = true) {
  await requireAdmin();
  const supabase = await createClient();
  await supabase.from("companies").delete().eq("id", companyId);
  invalidateQuery("bedrijven-page-data");
  invalidateQuery("leden-page-data");
  invalidateQuery("beheer-bedrijven-page-data");
  revalidatePath("/bedrijven");
  revalidatePath("/beheer/bedrijven");
  if (redirectAfter) redirect("/bedrijven");
}

// Goedkeuren/afwijzen mag door een bestaand lid van dit bedrijf of door
// bestuur/beheerder — company_membership_requests_decide_update (RLS) is de
// echte poortwachter hier; deze check is alleen voor een nette foutmelding.
export async function decideCompanyMembershipRequestAction(
  requestId: string,
  companyId: string,
  decision: "approved" | "rejected",
  reason?: string
): Promise<{ error?: string }> {
  const profile = await requireProfile();
  const supabase = await createClient();

  const { error, count } = await supabase
    .from("company_membership_requests")
    .update({ status: decision, decided_by: profile.id, decision_reason: reason?.trim() || null }, { count: "exact" })
    .eq("id", requestId);

  if (error || !count) {
    return { error: "Afhandelen is niet gelukt. Probeer het opnieuw." };
  }

  // Bij goedkeuring maakt een trigger meteen een company_members-rij aan,
  // wat de ledenlijst raakt.
  if (decision === "approved") {
    invalidateQuery("leden-page-data");
  }
  // Foutenrapport §0, fix 4: zonder dit liep de Beheer-badge/BeheerSidebar
  // tot 30s (de cache-TTL) achter op een zojuist afgehandeld koppelverzoek.
  invalidateQuery("beheer-waiting-counts");
  revalidatePath(await getCompanySlugPath(supabase, companyId));
  // Deze actie wordt ook vanaf het beheerdashboard ("Wacht op jou") en vanaf
  // Beheer -> Aanvragen -> Bedrijfskoppelingen aangeroepen — zonder deze
  // revalidates bleef een net afgehandeld verzoek daar nog even (tot de
  // volgende navigatie) in de lijst staan.
  revalidatePath("/beheer");
  revalidatePath("/beheer/instroom");
  revalidatePath("/beheer/bedrijven");
  return {};
}

export type UpdateCompanyBillingState = { error?: string; success?: boolean };

// Rechten: zelfde als updateCompanyAction (elk gekoppeld lid, of bestuur/
// beheer) — company_billing_details_member_* (RLS) is de echte poortwachter,
// requireProfile() hier is alleen de inlog-check.
export async function updateCompanyBillingAction(
  companyId: string,
  _prevState: UpdateCompanyBillingState,
  formData: FormData
): Promise<UpdateCompanyBillingState> {
  await requireProfile();
  const supabase = await createClient();

  const sameAsVisitAddress = formData.get("same_as_visit_address") === "on";

  // invoice_name/vat_number/invoice_email staan los van het vinkje (dat
  // gaat specifiek over het adres) en worden altijd opgeslagen. De
  // adresvelden zelf staan bij "zelfde als bezoekadres" niet eens in het
  // formulier — die laten we dan ongemoeid, zodat een eerder ingevuld
  // afwijkend adres intact blijft als iemand het vinkje weer aanzet en
  // opnieuw opslaat zonder de adresvelden te wijzigen.
  const payload: Database["public"]["Tables"]["company_billing_details"]["Insert"] = {
    company_id: companyId,
    same_as_visit_address: sameAsVisitAddress,
    invoice_name: String(formData.get("invoice_name") ?? "").trim() || null,
    vat_number: String(formData.get("vat_number") ?? "").trim() || null,
    invoice_email: String(formData.get("invoice_email") ?? "").trim() || null,
  };

  if (!sameAsVisitAddress) {
    payload.invoice_address = String(formData.get("invoice_address") ?? "").trim() || null;
    payload.invoice_postal_code = String(formData.get("invoice_postal_code") ?? "").trim() || null;
    payload.invoice_city = String(formData.get("invoice_city") ?? "").trim() || null;
    payload.invoice_country = String(formData.get("invoice_country") ?? "").trim() || "Nederland";
  }

  const { error } = await supabase.from("company_billing_details").upsert(payload, { onConflict: "company_id" });

  if (error) {
    return { error: "Opslaan is niet gelukt. Probeer het opnieuw." };
  }

  // Zonder deze regel bleef Beheer -> Bedrijven -> Factuurgegevens tot wel 5
  // minuten de oude (gecachte) btw-gegevens tonen na het opslaan hier.
  invalidateQuery("beheer-bedrijven-page-billing");
  revalidatePath(await getCompanySlugPath(supabase, companyId, "/bewerken"));
  revalidatePath("/beheer/bedrijven");
  return { success: true };
}

export type InviteColleagueState = { error?: string; success?: boolean };

const INVITATION_VALIDITY_MS = 14 * 24 * 60 * 60 * 1000;

// Automatische berichten, uitnodiging-in-drieën: een bestaand, actief
// gekoppeld lid van dit bedrijf (of bestuur/beheer) mag een collega
// uitnodigen. invitations.company_id wordt hier gezet door iemand die al
// bij dit bedrijf hoort — handle_new_user (migratie 0126) koppelt daarom
// direct door als de registrant dit voorgestelde bedrijf aanhoudt, zonder
// tussenkomst van een koppelverzoek.
export async function inviteColleagueAction(
  companyId: string,
  _prevState: InviteColleagueState,
  formData: FormData
): Promise<InviteColleagueState> {
  const profile = await requireProfile();
  const supabase = await createClient();

  if (!isBoard(profile.role)) {
    const { count } = await supabase
      .from("company_members")
      .select("id", { count: "exact", head: true })
      .eq("company_id", companyId)
      .eq("profile_id", profile.id);
    if (!count) {
      return { error: "Je bent zelf niet gekoppeld aan dit bedrijf." };
    }
  }

  const email = String(formData.get("email") ?? "").trim();
  const firstName = String(formData.get("first_name") ?? "").trim();
  if (!email) {
    return { error: "Vul een e-mailadres in." };
  }
  if (!isEmailConfigured()) {
    return { error: "E-mail versturen is niet geconfigureerd." };
  }

  const { data: company } = await supabase.from("companies").select("name, slug").eq("id", companyId).maybeSingle();
  if (!company) {
    return { error: "Bedrijf niet gevonden." };
  }

  const { data: invitation, error } = await supabase
    .from("invitations")
    .insert({
      email,
      role: "lid",
      invited_by: profile.id,
      first_name: firstName || null,
      company_id: companyId,
      source: "collega",
      expires_at: new Date(Date.now() + INVITATION_VALIDITY_MS).toISOString(),
    })
    .select("token")
    .single();

  if (error || !invitation) {
    return { error: "Uitnodigen is niet gelukt. Probeer het opnieuw." };
  }

  const link = `${process.env.SITE_URL ?? ""}/register/${invitation.token}`;
  const rendered = await renderMessageEmail("uit-collega", link, {
    greeting: invitationGreeting(firstName),
    naam_uitnodiger: `${profile.first_name} ${profile.last_name}`,
    bedrijf: company.name,
  });
  const { error: emailError } = rendered
    ? await sendRawHtmlEmail(email, rendered.subject, rendered.html)
    : { error: "Sjabloon ontbreekt." };

  if (!emailError) {
    await supabase.from("invitations").update({ last_sent_at: new Date().toISOString() }).eq("token", invitation.token);
  }

  revalidatePath(companyHref({ slug: company.slug }));
  if (emailError) {
    return { error: `Uitnodiging aangemaakt, maar de e-mail versturen is niet gelukt (${emailError}).` };
  }
  return { success: true };
}

// Lidmaatschap Deel 1: "lid sinds" is optioneel, door het bedrijf zelf in
// te vullen (niet alleen bestuur) — zelfde ruimere-dan-updateCompanyAction-
// permissie als updateCompanyShowAddressAction hierboven, via de smalle
// set_company_member_since-RPC (0175).
export async function updateCompanyMemberSinceAction(companyId: string, memberSince: string | null): Promise<{ error?: string }> {
  await requireProfile();
  const supabase = await createClient();

  const { error } = await supabase.rpc("set_company_member_since", {
    p_company_id: companyId,
    p_date: memberSince,
  });

  if (error) {
    return { error: "Opslaan is niet gelukt. Probeer het opnieuw." };
  }
  invalidateQuery("bedrijven-page-data");
  revalidatePath(await getCompanySlugPath(supabase, companyId));
  return {};
}

// Opzeggen via de bedrijfspagina — alleen het primaire contact (RLS-achtige
// check staat in de RPC zelf, request_company_cancellation, 0176). Kiest
// een harde einddatum; de status verandert nog niet (blijft 'lid') tot de
// bevestigingsmail-link is aangeklikt (zie /opzegging-bevestigen). De RPC
// zet alleen membership_end_date en meldt bestuur; het versturen van de
// mail zelf gebeurt hier, in de TS-laag (zelfde scheiding als overal elders
// in deze codebase — SQL raakt nooit SMTP aan).
export async function requestCompanyCancellationAction(companyId: string, endDate: string): Promise<{ error?: string; success?: boolean }> {
  const profile = await requireProfile();
  const supabase = await createClient();

  const { error } = await supabase.rpc("request_company_cancellation", {
    p_company_id: companyId,
    p_end_date: endDate,
  });
  if (error) {
    return { error: "Opzeggen is niet gelukt. Controleer of je het primaire contact van dit bedrijf bent." };
  }

  const { data: company } = await supabase.from("companies").select("name, slug").eq("id", companyId).maybeSingle();

  if (isEmailConfigured() && company) {
    const link = buildCancellationConfirmUrl(process.env.SITE_URL ?? "", companyId);
    const rendered = await renderMessageEmail("opzeg-bevestiging", link, {
      greeting: invitationGreeting(profile.first_name),
      bedrijf: company.name,
      einddatum: new Date(endDate).toLocaleDateString("nl-NL"),
    });
    if (rendered) {
      await sendRawHtmlEmail(profile.email, rendered.subject, rendered.html);
    }
  }

  invalidateQuery("bedrijven-page-data");
  revalidatePath(company?.slug ? companyHref({ slug: company.slug }) : `/bedrijven/${companyId}`);
  return { success: true };
}

// Bestuur zegt een lidmaatschap zelf op — direct bevestigd, geen e-mail
// nodig (dit is al een geautoriseerde bestuursactie, geen zelfservice-
// verzoek van het bedrijf zelf).
export async function boardCancelCompanyMembershipAction(companyId: string, endDate: string): Promise<{ error?: string; success?: boolean }> {
  await requireBoard();
  const supabase = await createClient();

  const { error } = await supabase.rpc("board_cancel_company_membership", {
    p_company_id: companyId,
    p_end_date: endDate,
  });
  if (error) {
    return { error: "Opzeggen is niet gelukt. Probeer het opnieuw." };
  }

  invalidateQuery("bedrijven-page-data");
  invalidateQuery("beheer-bedrijven-page-data");
  revalidatePath(await getCompanySlugPath(supabase, companyId));
  revalidatePath("/beheer/bedrijven");
  return { success: true };
}

// Bestuur wijzigt het primaire contact (via set_company_primary_contact,
// 0175) — alleen relevant als een bedrijf meerdere gekoppelde personen
// heeft; de term "primair contact" zelf is bewust nergens member-facing
// zichtbaar.
export async function setCompanyPrimaryContactAction(companyId: string, profileId: string): Promise<{ error?: string; success?: boolean }> {
  await requireBoard();
  const supabase = await createClient();

  const { error } = await supabase.rpc("set_company_primary_contact", {
    p_company_id: companyId,
    p_profile_id: profileId,
  });
  if (error) {
    return { error: "Wijzigen is niet gelukt. Probeer het opnieuw." };
  }

  invalidateQuery("beheer-bedrijven-page-data");
  revalidatePath(await getCompanySlugPath(supabase, companyId));
  return { success: true };
}
