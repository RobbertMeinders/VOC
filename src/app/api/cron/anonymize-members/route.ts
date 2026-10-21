import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

// Hit once a day by Vercel Cron (see vercel.json). 90 dagen na deactivering
// (profiles.deactivated_at, gezet door updateMemberActiveAction) worden
// persoonsgegevens automatisch geanonimiseerd — geplaatste berichten/
// reacties/likes blijven gewoon staan (nu onder "Verwijderd lid").
//
// anonymize_expired_profiles() (0037_retention_and_push_preferences.sql)
// raakt alleen public.profiles; het bijbehorende auth.users-e-mailadres
// (waarmee nog ingelogd/een wachtwoord gereset zou kunnen worden) wordt
// hier apart overschreven via de Supabase Admin API, die alleen server-
// side met de service_role-sleutel werkt.
//
// delete_expired_prospects() (0051_prospects.sql) ruimt dezelfde 90-dagen-
// bewaartermijn op voor niet-leden die zich via de openbare agenda hebben
// aangemeld (public_activity_registrations) — hoort inhoudelijk bij een
// ander bewaartermijn-onderwerp, maar hoeft er geen aparte dagelijkse cron
// (en dus aparte vercel.json-entry) voor te hebben.
//
// AVG-fix (portaal-gezondheidsonderzoek A6, migratie 0136): de auth.users-
// e-mailwijziging en de avatar-opruiming hieronder lopen BUITEN de
// database-transactie van anonymize_expired_profiles() om, via de Admin
// API — een mislukte aanroep (netwerkhik, tijdelijke storing) liet het
// echte e-mailadres voorheen voorgoed in auth.users staan, zonder ooit
// opnieuw geprobeerd te worden (zodra anonymized_at gezet is, selecteert
// anonymize_expired_profiles() die rij nooit meer). get_profiles_pending_
// auth_scrub() geeft bij ELKE run opnieuw alle nog openstaande rijen terug
// — ook een eerder mislukte poging, en ook rijen die via de directe
// "Verwijderen"-knop (anonymize_profile_now(), leden/[id]/actions.ts)
// geanonimiseerd zijn — zodat dit altijd een retry krijgt i.p.v. stil te
// blijven liggen.
export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (!process.env.CRON_SECRET || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // anonymize_expired_profiles()/delete_expired_prospects() staan sinds
  // 0060_restrict_cron_only_rpcs_and_registration_update.sql alleen nog open
  // voor service_role — deze route gebruikte de admin-client toch al voor
  // de auth.admin-aanroep verderop, dus nu voor alles in één keer.
  const admin = createAdminClient();
  const [
    { error },
    { data: deletedProspects, error: prospectsError },
    { data: deletedEvents, error: eventsError },
    { data: deletedInvitations, error: invitationsError },
  ] = await Promise.all([
    admin.rpc("anonymize_expired_profiles"),
    admin.rpc("delete_expired_prospects"),
    // cleanup_old_events (portaal-gezondheid Blok C): events groeit
    // ongelimiteerd zonder dit — hoort inhoudelijk niet bij bewaartermijnen
    // voor persoonsgegevens, maar hoeft er net als delete_expired_prospects
    // geen eigen dagelijkse cron/vercel.json-entry voor te hebben.
    admin.rpc("cleanup_old_events"),
    // delete_expired_invitations (diepte-audit Blok B2): zelfde reden als
    // hierboven — een eigen bewaartermijn-opruiming die geen aparte cron
    // verdient.
    admin.rpc("delete_expired_invitations"),
  ]);
  if (eventsError) {
    console.error("[cron] anonymize-members: cleanup_old_events mislukt:", eventsError);
  }
  if (invitationsError) {
    console.error("[cron] anonymize-members: delete_expired_invitations mislukt:", invitationsError);
  }

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const { data: pending, error: pendingError } = await admin.rpc("get_profiles_pending_auth_scrub");
  if (pendingError) {
    return NextResponse.json({ error: pendingError.message }, { status: 500 });
  }

  const authScrubbedIds: string[] = [];
  for (const row of pending ?? []) {
    const { error: authError } = await admin.auth.admin.updateUserById(row.profile_id, {
      email: `verwijderd-${row.profile_id}@voc-ledenportaal.invalid`,
    });
    if (!authError) {
      authScrubbedIds.push(row.profile_id);
    } else {
      console.error(`[cron] anonymize-members: auth.users-update mislukt voor ${row.profile_id}:`, authError);
    }
  }
  if (authScrubbedIds.length > 0) {
    await admin.rpc("mark_profiles_auth_scrubbed", { p_ids: authScrubbedIds });
  }

  // anonymize_expired_profiles() (0063) nult avatar_url op de rij maar kan
  // vanuit SQL het onderliggende Storage-bestand niet verwijderen — dat
  // gebeurt hier, met dezelfde admin-client. Zonder deze stap bleef een
  // oude profielfoto van een geanonimiseerd lid voor altijd in de
  // avatars-bucket staan, en (als publicly_visible ooit true was) mogelijk
  // zelfs voor altijd publiek opvraagbaar via de directe Storage-URL.
  const avatarRows = (pending ?? []).filter((row) => row.pending_avatar_cleanup);
  const avatarPaths = avatarRows.flatMap((row) => (row.pending_avatar_cleanup ? [row.pending_avatar_cleanup] : []));
  if (avatarPaths.length > 0) {
    const { error: storageError } = await admin.storage.from("avatars").remove(avatarPaths);
    if (storageError) {
      console.error("[cron] anonymize-members: avatar cleanup failed:", storageError);
    } else {
      await admin.rpc("mark_profiles_avatar_cleaned", { p_ids: avatarRows.map((row) => row.profile_id) });
    }
  }

  return NextResponse.json({
    pendingAuthScrub: (pending ?? []).length,
    authUpdated: authScrubbedIds.length,
    avatarsRemoved: avatarPaths.length,
    deletedProspects: prospectsError ? null : deletedProspects,
    deletedEvents: eventsError ? null : deletedEvents,
    deletedInvitations: invitationsError ? null : deletedInvitations,
  });
}
