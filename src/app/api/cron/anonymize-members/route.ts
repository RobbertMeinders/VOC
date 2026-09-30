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
  const [{ data: anonymized, error }, { data: deletedProspects, error: prospectsError }] = await Promise.all([
    admin.rpc("anonymize_expired_profiles"),
    admin.rpc("delete_expired_prospects"),
  ]);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  let authUpdated = 0;
  for (const row of anonymized ?? []) {
    const { error: authError } = await admin.auth.admin.updateUserById(row.profile_id, {
      email: `verwijderd-${row.profile_id}@voc-ledenportaal.invalid`,
    });
    if (!authError) authUpdated++;
  }

  // anonymize_expired_profiles() (0063) nult avatar_url op de rij maar kan
  // vanuit SQL het onderliggende Storage-bestand niet verwijderen — dat
  // gebeurt hier, met dezelfde admin-client. Zonder deze stap bleef een
  // oude profielfoto van een geanonimiseerd lid voor altijd in de
  // avatars-bucket staan, en (als publicly_visible ooit true was) mogelijk
  // zelfs voor altijd publiek opvraagbaar via de directe Storage-URL.
  const avatarPaths = (anonymized ?? []).flatMap((row) => (row.old_avatar_url ? [row.old_avatar_url] : []));
  if (avatarPaths.length > 0) {
    const { error: storageError } = await admin.storage.from("avatars").remove(avatarPaths);
    if (storageError) {
      console.error("[cron] anonymize-members: avatar cleanup failed:", storageError);
    }
  }

  return NextResponse.json({
    anonymized: (anonymized ?? []).length,
    authUpdated,
    avatarsRemoved: avatarPaths.length,
    deletedProspects: prospectsError ? null : deletedProspects,
  });
}
