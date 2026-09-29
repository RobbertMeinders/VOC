import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/auth/session";

// Los JSON-endpoint i.p.v. dit gewoon in de server-gerenderde detailpagina
// zelf mee te geven: dit wordt pas client-side aangeroepen NADAT de Storage
// Access API alsnog toegang tot de sessiecookie heeft gegeven (zie
// MemberOrVisitorRegistration) — op het moment dat de pagina zelf
// server-side rendert (het allereerste request van de iframe), is die
// toegang er nog niet, dus levert getCurrentProfile() daar altijd null op
// in de echte cross-site-embedsituatie.
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const profile = await getCurrentProfile();
  if (!profile) {
    return NextResponse.json({ profile: null });
  }

  const supabase = await createClient();
  const [{ data: activity }, registrationResult, confirmedCountResult] = await Promise.all([
    supabase.from("activities").select("max_participants, registration_deadline").eq("id", id).maybeSingle(),
    supabase
      .from("activity_registrations")
      .select("is_waitlisted")
      .eq("activity_id", id)
      .eq("profile_id", profile.id)
      .maybeSingle(),
    supabase
      .from("activity_registrations")
      .select("id", { count: "exact", head: true })
      .eq("activity_id", id)
      .eq("is_waitlisted", false),
  ]);

  const confirmedCount = confirmedCountResult.count ?? 0;
  const isFull = activity?.max_participants != null && confirmedCount >= activity.max_participants;
  const deadlinePassed = activity?.registration_deadline ? new Date(activity.registration_deadline) < new Date() : false;

  return NextResponse.json({
    profile: { firstName: profile.first_name },
    registration: registrationResult.data,
    isFull,
    deadlinePassed,
  });
}
