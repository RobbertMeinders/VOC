import { NextResponse } from "next/server";
import { requireProfile } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { buildActivityIcs } from "@/lib/agenda/ics";
import { activityHref, activityIdFilter, resolveActivitySlugAlias } from "@/lib/agenda/slug";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  await requireProfile();
  const { id } = await params;

  const supabase = await createClient();
  const { data: activity } = await supabase
    .from("activities")
    .select("id, slug, title, description, location, starts_at, ends_at")
    .filter(...activityIdFilter(id))
    .maybeSingle();

  if (!activity) {
    // URL-ronde #100: een verouderde slug (zie activity_slug_aliases,
    // migratie 0155) stuurt door naar de .ics-route onder de huidige slug
    // i.p.v. meteen 404 te geven.
    const currentSlug = await resolveActivitySlugAlias(supabase, id);
    if (currentSlug) {
      return NextResponse.redirect(new URL(activityHref({ slug: currentSlug }, "/ics"), request.url), 308);
    }
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
