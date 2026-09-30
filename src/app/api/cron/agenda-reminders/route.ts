import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

// Hit once a day by Vercel Cron (see vercel.json). Vercel signs the request
// with `Authorization: Bearer $CRON_SECRET` when that env var is set on the
// project, so we just compare against it here.
export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (!process.env.CRON_SECRET || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // create_activity_reminders() staat sinds 0060_restrict_cron_only_rpcs_and_
  // registration_update.sql alleen nog open voor service_role.
  const supabase = createAdminClient();
  const { data, error } = await supabase.rpc("create_activity_reminders");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ remindersCreated: data ?? 0 });
}
