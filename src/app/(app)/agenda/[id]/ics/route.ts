import { NextResponse } from "next/server";
import { requireProfile } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { buildActivityIcs } from "@/lib/agenda/ics";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  await requireProfile();
  const { id } = await params;

  const supabase = await createClient();
  const { data: activity } = await supabase
    .from("activities")
    .select("id, title, description, location, starts_at, ends_at")
    .eq("id", id)
    .maybeSingle();

  if (!activity) {
    return NextResponse.json({ error: "Activiteit niet gevonden" }, { status: 404 });
  }

  const ics = buildActivityIcs(activity);
  const fileName = `${activity.title.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}.ics`;

  return new NextResponse(ics, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="${fileName}"`,
    },
  });
}
