import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getSignedStorageUrl, getSignedStorageUrls } from "@/lib/supabase/storage";
import type { CompanyDetailData } from "@/components/embed/CompanyDetailContent";

// Client-side aangeroepen door CompanyDetailView (klik op een bedrijf in
// de bedrijvengids-embed) — een los JSON-endpoint i.p.v. een paginanavigatie
// naar /embed/bedrijven/[slug], want die navigatie triggert in dit
// cross-origin iframe telkens opnieuw de height/scroll-top-postMessage-
// afhandeling (zie EmbedAutoHeight). Zelfde get_public_company()-RPC en
// signed-URL-opzet als die paginacomponent, alleen als kale JSON i.p.v.
// server-gerenderde HTML.
export async function GET(_request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const supabase = await createClient();

  const { data } = await supabase.rpc("get_public_company", { p_slug: slug });
  const company = data?.[0] ?? null;

  if (!company) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const [logoUrl, avatarUrls] = await Promise.all([
    getSignedStorageUrl("company-logos", company.logo_url),
    getSignedStorageUrls(
      supabase,
      "avatars",
      company.employees.map((e) => e.avatar_url)
    ),
  ]);

  const result: CompanyDetailData = {
    name: company.name,
    logoUrl,
    tagline: company.tagline,
    description: company.description,
    industry: company.industry,
    city: company.city,
    website: company.website,
    linkedinUrl: company.linkedin_url,
    instagramUrl: company.instagram_url,
    facebookUrl: company.facebook_url,
    employees: company.employees.map((e) => ({
      id: e.id,
      firstName: e.first_name,
      lastName: e.last_name,
      jobTitle: e.job_title,
      avatarUrl: e.avatar_url ? (avatarUrls.get(e.avatar_url) ?? null) : null,
    })),
  };

  return NextResponse.json(result);
}
