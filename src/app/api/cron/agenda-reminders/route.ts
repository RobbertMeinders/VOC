import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Hit once a day by Vercel Cron (see vercel.json). Vercel signs the request
// with `Authorization: Bearer $CRON_SECRET` when that env var is set on the
// project, so we just compare against it here.
export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (!process.env.CRON_SECRET || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("create_activity_reminders");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ remindersCreated: data ?? 0 });
}
