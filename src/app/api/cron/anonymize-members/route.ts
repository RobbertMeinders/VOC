import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
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

  const supabase = await createClient();
  const [{ data: anonymized, error }, { data: deletedProspects, error: prospectsError }] = await Promise.all([
    supabase.rpc("anonymize_expired_profiles"),
    supabase.rpc("delete_expired_prospects"),
  ]);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const admin = createAdminClient();
  let authUpdated = 0;
  for (const row of anonymized ?? []) {
    const { error: authError } = await admin.auth.admin.updateUserById(row.profile_id, {
      email: `verwijderd-${row.profile_id}@voc-ledenportaal.invalid`,
    });
    if (!authError) authUpdated++;
  }

  return NextResponse.json({
    anonymized: (anonymized ?? []).length,
    authUpdated,
    deletedProspects: prospectsError ? null : deletedProspects,
  });
}
