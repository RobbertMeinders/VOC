import { NextResponse } from "next/server";
import { requireProfile } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

// Self-service "download mijn gegevens" — geen beheerderstussenkomst nodig.
// Verzamelt alleen wat over de aanvrager zelf gaat (RLS + de eq()-filters
// hieronder zorgen daarvoor); geen technische/apparaat-data zoals
// push-subscriptions, dat is voor een lid zelf weinig betekenisvol.
export async function GET() {
  const profile = await requireProfile();
  const supabase = await createClient();

  const [{ data: posts }, { data: comments }, { data: registrations }, { data: membership }] = await Promise.all([
    supabase
      .from("feed_posts")
      .select("id, content, type, created_at, updated_at")
      .eq("author_id", profile.id)
      .order("created_at", { ascending: false }),
    supabase
      .from("feed_comments")
      .select("id, post_id, content, created_at")
      .eq("author_id", profile.id)
      .order("created_at", { ascending: false }),
    supabase
      .from("activity_registrations")
      .select("activity_id, is_waitlisted, attended, created_at, activity:activities(title, starts_at)")
      .eq("profile_id", profile.id)
      .order("created_at", { ascending: false }),
    supabase
      .from("company_members")
      .select("is_primary, created_at, company:companies(name)")
      .eq("profile_id", profile.id),
  ]);

  const data = {
    geëxporteerd_op: new Date().toISOString(),
    profiel: {
      naam: `${profile.first_name} ${profile.last_name}`,
      email: profile.email,
      telefoon: profile.phone,
      functie: profile.job_title,
      bio: profile.bio,
      linkedin: profile.linkedin_url,
      instagram: profile.instagram_url,
      facebook: profile.facebook_url,
      rol: profile.role,
      lid_sinds: profile.created_at,
    },
    bedrijfskoppeling: membership ?? [],
    activiteit_aanmeldingen: registrations ?? [],
    feed_berichten: posts ?? [],
    feed_reacties: comments ?? [],
  };

  return new NextResponse(JSON.stringify(data, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="mijn-gegevens-${profile.id}.json"`,
    },
  });
}
