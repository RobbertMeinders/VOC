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
import type { Database } from "@/lib/types/database";

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
  const { data: existing } = await supabase
    .from("companies")
    .select("address, postal_code, city, latitude, longitude, logo_url, logo_thumb_url")
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
  revalidatePath(`/bedrijven/${companyId}`);
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

  const { error, count } = await supabase
    .from("companies")
    .update(
      {
        name,
        industry: String(formData.get("industry") ?? "").trim() || null,
        city: String(formData.get("city") ?? "").trim() || null,
        phone: String(formData.get("phone") ?? "").trim() || null,
        email: String(formData.get("email") ?? "").trim() || null,
        website: String(formData.get("website") ?? "").trim() || null,
      },
      { count: "exact" }
    )
    .eq("id", companyId);

  if (error || !count) {
    return { error: "Opslaan is niet gelukt. Probeer het opnieuw." };
  }

  await logAuditAction("company_updated", "company", companyId);

  invalidateQuery("bedrijven-page-data");
  invalidateQuery("leden-page-data");
  invalidateQuery("beheer-bedrijven-page-data");
  revalidatePath(`/bedrijven/${companyId}`);
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
  revalidatePath(`/bedrijven/${companyId}`);
  revalidatePath("/profiel");
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
  decision: "approved" | "rejected"
): Promise<{ error?: string }> {
  const profile = await requireProfile();
  const supabase = await createClient();

  const { error, count } = await supabase
    .from("company_membership_requests")
    .update({ status: decision, decided_by: profile.id }, { count: "exact" })
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
  revalidatePath(`/bedrijven/${companyId}`);
  // Deze actie wordt ook vanaf het beheerdashboard ("Wacht op jou")
  // aangeroepen — zonder deze revalidate bleef een net afgehandeld verzoek
  // daar nog even (tot de volgende navigatie) in de lijst staan.
  revalidatePath("/beheer");
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
  revalidatePath(`/bedrijven/${companyId}/bewerken`);
  revalidatePath("/beheer/bedrijven");
  return { success: true };
}
