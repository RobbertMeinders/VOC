import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { getSignedStorageUrls } from "@/lib/supabase/storage";
import { cachedQuery } from "@/lib/cache/queryCache";
import { BedrijvenListClient, type SearchableCompany } from "@/components/company/BedrijvenListClient";
import { NetworkTabs } from "@/components/layout/NetworkTabs";

export const metadata: Metadata = { title: "Bedrijven" };

type MembershipRow = { company_id: string; profile: { first_name: string; last_name: string } | null };

export default async function BedrijvenPage() {
  const supabase = await createClient();

  // Zichtbaarheid is voor elk actief lid identiek (companies_members_select
  // kent geen per-gebruiker variatie), dus dit resultaat delen tussen
  // leden/requests is veilig.
  const [{ data: companies }, { data: memberships }] = await cachedQuery("bedrijven-page-data", 60_000, () =>
    Promise.all([
      supabase
        .from("companies")
        .select("id, name, industry, city, logo_url, logo_thumb_url, tagline, latitude, longitude, show_address")
        .order("name"),
      // UX-review Z4: bedrijven ook doorzoekbaar op de namen van de mensen
      // die er werken — alleen gebruikt om op te matchen, niet getoond.
      supabase.from("company_members").select("company_id, profile:profiles(first_name, last_name)").returns<MembershipRow[]>(),
    ])
  );

  const branches = Array.from(
    new Set((companies ?? []).map((c) => c.industry).filter((v): v is string => Boolean(v)))
  ).sort((a, b) => a.localeCompare(b));

  const peopleByCompany = new Map<string, string[]>();
  for (const membership of memberships ?? []) {
    if (!membership.profile) continue;
    const names = peopleByCompany.get(membership.company_id) ?? [];
    names.push(`${membership.profile.first_name} ${membership.profile.last_name}`);
    peopleByCompany.set(membership.company_id, names);
  }

  // Thumbnail-paden in dezelfde batch-aanroep (performance-audit #1): de
  // lijst toont een logo van 40px, daar is de kleine versie (max 160px) ruim
  // genoeg voor. Een bedrijf zonder thumbnail valt terug op het volle logo.
  const logoUrls = await getSignedStorageUrls(
    supabase,
    "company-logos",
    (companies ?? []).flatMap((c) => [c.logo_url, c.logo_thumb_url])
  );

  const items: SearchableCompany[] = (companies ?? []).map((c) => {
    const path = c.logo_thumb_url ?? c.logo_url;
    return {
      id: c.id,
      name: c.name,
      industry: c.industry,
      city: c.city,
      logoUrl: path ? (logoUrls.get(path) ?? null) : null,
      tagline: c.tagline,
      // Verborgen adres betekent ook geen marker op de kaart.
      latitude: c.show_address ? c.latitude : null,
      longitude: c.show_address ? c.longitude : null,
      peopleNames: peopleByCompany.get(c.id) ?? [],
    };
  });

  return (
    <div>
      <h1 className="mb-3 font-display text-[1.75rem] font-extrabold tracking-[-0.03em] text-foreground sm:text-[2rem]">Netwerk</h1>
      <NetworkTabs />

      <BedrijvenListClient items={items} branches={branches} />
    </div>
  );
}
