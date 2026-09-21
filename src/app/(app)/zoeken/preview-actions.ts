"use server";

import { requireProfile } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { getSignedStorageUrl } from "@/lib/supabase/storage";

export type SearchPreviewItem = {
  id: string;
  type: "member" | "company" | "activity" | "document";
  title: string;
  subtitle: string | null;
  href: string;
  avatarUrl?: string | null;
  initials?: string;
};

const PREVIEW_LIMIT = 5;

/**
 * Lichte live-preview voor de zoekoverlay: begrensde, geïndexeerde ilike-
 * queries per tabel (max 5 elk) i.p.v. de volledige tabellen ophalen en
 * client-side filteren zoals de /zoeken-pagina zelf doet — die aanpak is
 * hier te zwaar voor iets dat bij elke toetsaanslag opnieuw draait.
 */
export async function searchPreviewAction(rawQuery: string): Promise<SearchPreviewItem[]> {
  const query = rawQuery.trim();
  if (query.length < 2) return [];

  await requireProfile();
  const supabase = await createClient();
  const like = `%${query}%`;
  // PostgREST's .or() splits on comma, so a comma in the query would break
  // the filter string — strip it for this particular ilike pair.
  const nameLike = `%${query.replace(/,/g, " ")}%`;

  const [{ data: profiles }, { data: companies }, { data: activities }, { data: documents }] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, first_name, last_name, avatar_url, job_title")
      .or(`first_name.ilike.${nameLike},last_name.ilike.${nameLike}`)
      .limit(PREVIEW_LIMIT),
    supabase.from("companies").select("id, name, city, logo_url").ilike("name", like).limit(PREVIEW_LIMIT),
    supabase.from("activities").select("id, title, location").ilike("title", like).limit(PREVIEW_LIMIT),
    supabase.from("documents").select("id, title, category").ilike("title", like).limit(PREVIEW_LIMIT),
  ]);

  const [avatarUrls, logoUrls] = await Promise.all([
    Promise.all((profiles ?? []).map((p) => getSignedStorageUrl("avatars", p.avatar_url))),
    Promise.all((companies ?? []).map((c) => getSignedStorageUrl("company-logos", c.logo_url))),
  ]);

  const items: SearchPreviewItem[] = [
    ...(profiles ?? []).map((p, i) => ({
      id: p.id,
      type: "member" as const,
      title: `${p.first_name} ${p.last_name}`,
      subtitle: p.job_title,
      href: `/leden/${p.id}`,
      avatarUrl: avatarUrls[i],
      initials: `${p.first_name.charAt(0)}${p.last_name.charAt(0)}`.toUpperCase(),
    })),
    ...(companies ?? []).map((c, i) => ({
      id: c.id,
      type: "company" as const,
      title: c.name,
      subtitle: c.city,
      href: `/bedrijven/${c.id}`,
      avatarUrl: logoUrls[i],
      initials: c.name.charAt(0).toUpperCase(),
    })),
    ...(activities ?? []).map((a) => ({
      id: a.id,
      type: "activity" as const,
      title: a.title,
      subtitle: a.location,
      href: `/agenda/${a.id}`,
    })),
    ...(documents ?? []).map((d) => ({
      id: d.id,
      type: "document" as const,
      title: d.title,
      subtitle: d.category,
      href: `/documenten`,
    })),
  ];

  return items.slice(0, PREVIEW_LIMIT);
}
