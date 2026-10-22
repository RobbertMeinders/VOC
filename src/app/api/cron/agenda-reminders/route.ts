import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isValidCronSecret } from "@/lib/auth/cron-secret";

// Hit once a day by Vercel Cron (see vercel.json). Vercel signs the request
// with `Authorization: Bearer $CRON_SECRET` when that env var is set on the
// project, so we just compare against it here.
export async function GET(request: Request) {
  if (!isValidCronSecret(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // create_activity_reminders() staat sinds 0060_restrict_cron_only_rpcs_and_
  // registration_update.sql alleen nog open voor service_role.
  const supabase = createAdminClient();
  const { data, error } = await supabase.rpc("create_activity_reminders");

  if (error) {
    // Alleen gelogd, niet teruggegeven -- een interne foutmelding (kan
    // tabel-/kolomnamen of andere implementatiedetails bevatten) hoort niet
    // in een API-respons, ook niet een die alleen met CRON_SECRET bereikbaar is.
    console.error("[cron/agenda-reminders] create_activity_reminders mislukt:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }

  return NextResponse.json({ remindersCreated: data ?? 0 });
}
