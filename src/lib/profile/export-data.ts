import "server-only";

import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/lib/auth/session";

// Gedeeld door de JSON-route (/api/profiel/export) en de leesbare pagina
// (/profiel/export) — zelfde query's, twee presentaties, zodat ze nooit uit
// de pas kunnen gaan lopen. Verzamelt alleen wat over de aanvrager zelf gaat
// (RLS + de eq()-filters hieronder zorgen daarvoor); geen technische/
// apparaat-data zoals push-subscriptions, dat is voor een lid zelf weinig
// betekenisvol.
export async function getOwnDataExport(profile: Profile) {
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
      .order("created_at", { ascending: false })
      .returns<
        {
          activity_id: string;
          is_waitlisted: boolean;
          attended: boolean;
          created_at: string;
          activity: { title: string; starts_at: string } | null;
        }[]
      >(),
    supabase
      .from("company_members")
      .select("is_primary, created_at, company:companies(name)")
      .eq("profile_id", profile.id)
      .returns<{ is_primary: boolean; created_at: string; company: { name: string } | null }[]>(),
  ]);

  return {
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
}
