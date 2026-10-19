"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireProfile } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendTemplatedEmail } from "@/lib/email/send";
import { isEmailRateLimited } from "@/lib/auth/rate-limit";
import { removePreviousImage, uploadImage } from "@/lib/supabase/upload";
import { invalidateQuery } from "@/lib/cache/queryCache";
import { REMEMBER_ME_COOKIE } from "@/lib/supabase/session-persistence";
import { logPushUnsubscribed } from "@/lib/events/log";

export type UpdateProfileState = { error?: string; success?: boolean };

export async function updateProfileAction(
  _prevState: UpdateProfileState,
  formData: FormData
): Promise<UpdateProfileState> {
  const profile = await requireProfile();

  const firstName = String(formData.get("first_name") ?? "").trim();
  const lastName = String(formData.get("last_name") ?? "").trim();
  const jobTitle = String(formData.get("job_title") ?? "").trim();
  const bio = String(formData.get("bio") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();
  const showEmail = formData.get("show_email") === "on";
  const showPhone = formData.get("show_phone") === "on";
  const linkedinUrl = String(formData.get("linkedin_url") ?? "").trim();

  if (!firstName || !lastName) {
    return { error: "Voor- en achternaam zijn verplicht." };
  }

  const supabase = await createClient();

  let avatarPath: string | undefined;
  // undefined = geen nieuwe avatar, dus kolom ongemoeid laten; null = wel een
  // nieuwe avatar maar geen (geslaagde) thumbnail ervoor (bv. SVG) — dan
  // expliciet leegmaken, anders zou een oude thumbnail bij een nieuwe
  // avatar blijven staan.
  let avatarThumbPath: string | null | undefined;
  const avatarFile = formData.get("avatar");
  if (avatarFile instanceof File && avatarFile.size > 0) {
    const result = await uploadImage(supabase, "avatars", profile.id, avatarFile);
    if ("error" in result) return { error: result.error };
    avatarPath = result.path;

    avatarThumbPath = null;
    const avatarThumbFile = formData.get("avatar_thumb");
    if (avatarThumbFile instanceof File && avatarThumbFile.size > 0) {
      const thumbResult = await uploadImage(supabase, "avatars", profile.id, avatarThumbFile);
      if (!("error" in thumbResult)) avatarThumbPath = thumbResult.path;
    }
  }

  const { error } = await supabase
    .from("profiles")
    .update({
      first_name: firstName,
      last_name: lastName,
      job_title: jobTitle || null,
      bio: bio || null,
      phone: phone || null,
      show_email: showEmail,
      show_phone: showPhone,
      linkedin_url: linkedinUrl || null,
      ...(avatarPath ? { avatar_url: avatarPath, avatar_thumb_url: avatarThumbPath } : {}),
    })
    .eq("id", profile.id);

  if (error) {
    return { error: "Opslaan is niet gelukt. Probeer het opnieuw." };
  }

  // Oude avatar pas nu verwijderen (na de geslaagde DB-update) — anders
  // zou een mislukte update de profielrij naar een al verwijderd bestand
  // laten wijzen. Blijft anders voor altijd staan (nieuwe upload krijgt
  // altijd een nieuwe, willekeurige bestandsnaam, nooit upsert).
  if (avatarPath) {
    await removePreviousImage(supabase, "avatars", profile.avatar_url);
    await removePreviousImage(supabase, "avatars", profile.avatar_thumb_url);
  }

  // Naam/functie/avatar staan ook in de ledenlijst.
  invalidateQuery("leden-page-data");
  invalidateQuery("beheer-leden-page-data");
  revalidatePath("/profiel");
  return { success: true };
}

export type PushActionResult = { error?: string };

export async function subscribeToPushAction(subscription: {
  endpoint: string;
  keys: { p256dh: string; auth: string };
}): Promise<PushActionResult> {
  const profile = await requireProfile();
  const supabase = await createClient();

  const { error } = await supabase.from("push_subscriptions").upsert(
    {
      profile_id: profile.id,
      endpoint: subscription.endpoint,
      p256dh: subscription.keys.p256dh,
      auth: subscription.keys.auth,
    },
    { onConflict: "endpoint" }
  );

  if (error) {
    return { error: "Aanmelden voor pushmeldingen is niet gelukt." };
  }
  return {};
}

export async function updateAttendedActivitiesVisibilityAction(visible: boolean): Promise<{ error?: string }> {
  const profile = await requireProfile();
  const supabase = await createClient();

  const { error } = await supabase
    .from("profiles")
    .update({ show_attended_activities: visible })
    .eq("id", profile.id);

  if (error) {
    // Loggen i.p.v. alleen de generieke melding teruggeven — als deze kolom
    // (migratie 0035) nog niet op de database staat, faalt de update met
    // "column does not exist", wat hier zichtbaar wordt i.p.v. alleen een
    // schakelaar die terugklapt zonder duidelijke reden.
    console.error("[profiel] updateAttendedActivitiesVisibilityAction failed:", error);
    return { error: "Wijzigen is niet gelukt. Probeer het opnieuw." };
  }
  revalidatePath(`/leden/${profile.id}`);
  return {};
}

// Mirror van updateAttendedActivitiesVisibilityAction hierboven — of naam
// + functie van dit lid mogen verschijnen op de openbare bedrijvengids-
// embed (/embed/bedrijven), onder "Werkzaam bij" van het eigen bedrijf.
// Standaard uit (0050_public_company_directory.sql): dit is bewust een
// eigen, per-persoon keuze, geen bedrijfsbrede aan/uit-knop.
// UX-review U1: de profielfoto-prompt op Home verdwijnt ook als je 'm zelf
// wegklikt (naast automatisch zodra er een foto staat) — dat moet iets
// vastleggen, anders komt de banner na elke login terug.
export async function dismissOnboardingAction(): Promise<{ error?: string }> {
  const profile = await requireProfile();
  const supabase = await createClient();

  const { error } = await supabase
    .from("profiles")
    .update({ onboarding_dismissed_at: new Date().toISOString() })
    .eq("id", profile.id);

  if (error) {
    return { error: "Wegklikken is niet gelukt. Probeer het opnieuw." };
  }
  revalidatePath("/");
  return {};
}

// Eigen, losstaande "weggeklikt"-vlag voor de introductiestap (zie
// IntroductionPrompt + 0110_introduction_prompt_dismissed.sql) — bewust
// een apart veld i.p.v. onboarding_dismissed_at hergebruiken, dat dekt
// profielvelden (foto/functie/bedrijf) en kan bij bestaande leden al lang
// geleden gezet zijn. Wegklikken verbergt alleen de Home-prompt; de
// introductie zelf blijft gewoon later te plaatsen via /profiel of de
// community-composer (zie IntroductionPrompt met dismissible={false}).
export async function dismissIntroductionPromptAction(): Promise<{ error?: string }> {
  const profile = await requireProfile();
  const supabase = await createClient();

  const { error } = await supabase
    .from("profiles")
    .update({ introduction_prompt_dismissed_at: new Date().toISOString() })
    .eq("id", profile.id);

  if (error) {
    return { error: "Wegklikken is niet gelukt. Probeer het opnieuw." };
  }
  revalidatePath("/");
  return {};
}

export async function updatePubliclyVisibleAction(visible: boolean): Promise<{ error?: string }> {
  const profile = await requireProfile();
  const supabase = await createClient();

  const { error } = await supabase.from("profiles").update({ publicly_visible: visible }).eq("id", profile.id);

  if (error) {
    console.error("[profiel] updatePubliclyVisibleAction failed:", error);
    return { error: "Wijzigen is niet gelukt. Probeer het opnieuw." };
  }
  return {};
}

// Standalone tegenhangers van de show_email/show_phone-schuifjes in
// ProfileForm — dezelfde twee kolommen, zodat deze instelling ook los op de
// instellingenpagina staat i.p.v. alleen via het volledige profielformulier.
export async function updateShowPhoneAction(visible: boolean): Promise<{ error?: string }> {
  const profile = await requireProfile();
  const supabase = await createClient();

  const { error } = await supabase.from("profiles").update({ show_phone: visible }).eq("id", profile.id);

  if (error) {
    return { error: "Wijzigen is niet gelukt. Probeer het opnieuw." };
  }
  revalidatePath(`/leden/${profile.id}`);
  revalidatePath("/profiel");
  return {};
}

export async function updateShowEmailAction(visible: boolean): Promise<{ error?: string }> {
  const profile = await requireProfile();
  const supabase = await createClient();

  const { error } = await supabase.from("profiles").update({ show_email: visible }).eq("id", profile.id);

  if (error) {
    return { error: "Wijzigen is niet gelukt. Probeer het opnieuw." };
  }
  revalidatePath(`/leden/${profile.id}`);
  revalidatePath("/profiel");
  return {};
}

// Communicatieplan: één keuze per categorie i.p.v. twee losse push/e-mail-
// schakelaars — zo kan een lid niet meer (zoals voorheen, allebei stond
// standaard aan) ongemerkt dubbel gemeld worden over dezelfde gebeurtenis.
// "Nieuwe leden" heeft geen keuze meer (zie get_pending_push_notifications/
// get_pending_email_notifications, migratie 0079): te lage urgentie voor een
// instant kanaal, blijft wel gewoon zichtbaar in de bel en de ledenlijst.
// Buiten "activities"/"feed" gaat alles altijd door (moderatiemeldingen voor
// bestuur/beheer, en de uitkomst van je eigen aanvraag/inzending/wachtlijst-
// plek).
export async function updateNotificationChannelAction(
  category: "activities" | "feed",
  choice: "push" | "email" | "both" | "none"
): Promise<{ error?: string }> {
  const profile = await requireProfile();
  const supabase = await createClient();

  const pushEnabled = choice === "push" || choice === "both";
  const emailEnabled = choice === "email" || choice === "both";

  const update =
    category === "activities"
      ? { push_activities: pushEnabled, email_activities: emailEnabled }
      : { push_feed: pushEnabled, email_feed: emailEnabled };

  const { error } = await supabase.from("profiles").update(update).eq("id", profile.id);

  if (error) {
    return { error: "Wijzigen is niet gelukt. Probeer het opnieuw." };
  }
  return {};
}

// Los van updateNotificationPreference hierboven — campagnes (0067_
// newsletter_send.sql) zijn geen van de 12 getriggerde notificatietypes,
// alleen een e-mailkanaal (geen push-variant), vandaar een eigen, kleine
// action i.p.v. een geforceerde pas in de push/email-matrix.
export async function updateEmailCampaignsAction(enabled: boolean): Promise<{ error?: string }> {
  const profile = await requireProfile();
  const supabase = await createClient();

  const { error } = await supabase.from("profiles").update({ email_campaigns: enabled }).eq("id", profile.id);

  if (error) {
    return { error: "Wijzigen is niet gelukt. Probeer het opnieuw." };
  }
  return {};
}

export async function unsubscribeFromPushAction(endpoint: string): Promise<void> {
  const profile = await requireProfile();
  const supabase = await createClient();
  await supabase.from("push_subscriptions").delete().eq("endpoint", endpoint).eq("profile_id", profile.id);
  await logPushUnsubscribed(endpoint, profile.id);
}

export type ChangeEmailState = { error?: string; success?: boolean };

export async function changeEmailAction(_prevState: ChangeEmailState, formData: FormData): Promise<ChangeEmailState> {
  const profile = await requireProfile();
  const email = String(formData.get("email") ?? "").trim();

  if (!email) {
    return { error: "Vul een e-mailadres in." };
  }

  if (await isEmailRateLimited("email_change_requested", email)) {
    return { error: "Te veel pogingen. Probeer het over een kwartier opnieuw." };
  }

  // Niet langer auth.updateUser({ email }): dat liet Supabase zelf de
  // bevestigingsmails versturen, vanaf Supabase's eigen afzenderadres i.p.v.
  // info@vocveendam.nl. Zelfde patroon als wachtwoord-reset/magic link:
  // generateLink maakt alleen de tokens aan (geen mail), en we versturen ze
  // zelf via het eigen sjabloon/SMTP-adres. "Secure email change" staat aan
  // op dit project (zie EmailChangeForm's bevestigingstekst), dus zowel het
  // huidige als het nieuwe adres moet apart bevestigen voordat de wijziging
  // echt ingaat — vandaar twee generateLink-aanroepen/mails i.p.v. één.
  try {
    const admin = createAdminClient();
    const [currentLink, newLink] = await Promise.all([
      admin.auth.admin.generateLink({ type: "email_change_current", email: profile.email, newEmail: email }),
      admin.auth.admin.generateLink({ type: "email_change_new", email: profile.email, newEmail: email }),
    ]);
    const currentToken = currentLink.data?.properties?.hashed_token;
    const newToken = newLink.data?.properties?.hashed_token;

    if (currentLink.error || newLink.error || !currentToken || !newToken) {
      return { error: "Wijzigen is niet gelukt. Probeer het opnieuw." };
    }

    const siteUrl = (process.env.SITE_URL ?? "").replace(/\/$/, "");
    const buildLink = (token: string) => `${siteUrl}/auth/confirm?token_hash=${token}&type=email_change&next=/instellingen`;
    await Promise.all([
      sendTemplatedEmail("email_wijzigen", profile.email, { link: buildLink(currentToken) }),
      sendTemplatedEmail("email_wijzigen", email, { link: buildLink(newToken) }),
    ]);
  } catch {
    return { error: "Wijzigen is niet gelukt. Probeer het opnieuw." };
  }

  return { success: true };
}

export type UpdateCompanyMembershipState = { error?: string; success?: boolean; pending?: boolean };

function slugify(name: string, suffix: string): string {
  return `${name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "")}-${suffix}`;
}

export async function updateMyCompanyAction(
  _prevState: UpdateCompanyMembershipState,
  formData: FormData
): Promise<UpdateCompanyMembershipState> {
  const profile = await requireProfile();
  const companyMode = String(formData.get("company_mode") ?? "existing");
  const companyId = String(formData.get("company_id") ?? "").trim();
  const newCompanyName = String(formData.get("new_company_name") ?? "").trim();
  const newCompanyIndustry = String(formData.get("new_company_industry") ?? "").trim();
  const newCompanyCity = String(formData.get("new_company_city") ?? "").trim();
  const newCompanyWebsite = String(formData.get("new_company_website") ?? "").trim();

  if (companyMode === "existing" && !companyId) {
    return { error: "Zoek en selecteer je bedrijf, of maak een nieuw bedrijf aan." };
  }
  if (companyMode === "new" && !newCompanyName) {
    return { error: "Vul de bedrijfsnaam in." };
  }

  const supabase = await createClient();
  let targetCompanyId = companyId;

  if (companyMode === "new") {
    const { data: newCompany, error } = await supabase
      .from("companies")
      .insert({
        name: newCompanyName,
        slug: slugify(newCompanyName, profile.id.slice(0, 8)),
        industry: newCompanyIndustry || null,
        city: newCompanyCity || null,
        website: newCompanyWebsite || null,
      })
      .select("id")
      .single();

    if (error || !newCompany) {
      return { error: "Bedrijf aanmaken is niet gelukt. Probeer het opnieuw." };
    }
    targetCompanyId = newCompany.id;
  }

  if (companyMode === "new") {
    // Net aangemaakt door dit lid — niemand hoeft dat goed te keuren. Eerst
    // de nieuwe koppeling leggen, en de oude pas verwijderen als dat gelukt
    // is — anders blijft een lid zonder enig bedrijf achter als deze insert
    // onverwacht mislukt (F1).
    const { error: linkError } = await supabase
      .from("company_members")
      .insert({ company_id: targetCompanyId, profile_id: profile.id, is_primary: true });

    if (linkError) {
      return { error: "Koppelen aan het bedrijf is niet gelukt. Probeer het opnieuw." };
    }

    await supabase.from("company_members").delete().eq("profile_id", profile.id).neq("company_id", targetCompanyId);

    // Nieuw bedrijf + koppeling staan meteen in de bedrijven- en ledenlijst.
    invalidateQuery("bedrijven-page-data");
    invalidateQuery("leden-page-data");
    invalidateQuery("beheer-bedrijven-page-data");
    revalidatePath("/profiel");
    return { success: true };
  }

  // Bestaand bedrijf: een bedrijfsgenoot of bestuur/beheerder moet dit nog
  // goedkeuren — de huidige koppeling (indien aanwezig) blijft dus gewoon
  // staan tot die goedkeuring er is (anders staat dit lid tijdens het
  // wachten op goedkeuring nergens meer als "werkzaam bij", F1). Pas
  // handle_company_membership_decision (0013, bij approval) ruimt de oude
  // koppeling op, samen met het leggen van de nieuwe.
  const { error: requestError } = await supabase.from("company_membership_requests").upsert(
    { company_id: targetCompanyId, profile_id: profile.id, status: "pending", decided_by: null, decided_at: null },
    { onConflict: "company_id,profile_id" }
  );

  if (requestError) {
    return { error: "Aanvraag versturen is niet gelukt. Probeer het opnieuw." };
  }

  revalidatePath("/profiel");
  return { success: true, pending: true };
}

// Zelfservice-tegenhanger van updateMemberActiveAction (leden/[id]/actions.ts,
// bestuur/beheer-only): een lid zet hiermee zijn eigen account uit. Zelfde
// bewaartermijn-mechanisme (deactivated_at start de 90-dagen-aftelling naar
// anonymize_expired_profiles, 0037_retention_and_push_preferences.sql) —
// geen directe harde verwijdering, en geen self-service manier om dat te
// versnellen; alleen het bestuur kan binnen die termijn nog heractiveren.
export async function deleteMyAccountAction(): Promise<{ error?: string }> {
  const profile = await requireProfile();
  const supabase = await createClient();

  const { error } = await supabase
    .from("profiles")
    .update({ is_active: false, deactivated_at: new Date().toISOString() })
    .eq("id", profile.id);

  if (error) {
    return { error: "Verwijderen is niet gelukt. Probeer het opnieuw." };
  }

  await supabase.auth.signOut();
  (await cookies()).delete(REMEMBER_ME_COOKIE);
  redirect("/login?deleted=1");
}
