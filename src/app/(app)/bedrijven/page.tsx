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
        .select("id, name, industry, city, logo_url, tagline, latitude, longitude, show_address")
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

  const logoUrls = await getSignedStorageUrls(
    supabase,
    "company-logos",
    (companies ?? []).map((c) => c.logo_url)
  );

  const items: SearchableCompany[] = (companies ?? []).map((c) => ({
    id: c.id,
    name: c.name,
    industry: c.industry,
    city: c.city,
    logoUrl: c.logo_url ? (logoUrls.get(c.logo_url) ?? null) : null,
    tagline: c.tagline,
    // Verborgen adres betekent ook geen marker op de kaart.
    latitude: c.show_address ? c.latitude : null,
    longitude: c.show_address ? c.longitude : null,
    peopleNames: peopleByCompany.get(c.id) ?? [],
  }));

  return (
    <div>
      <h1 className="mb-3 text-xl font-semibold text-foreground">Netwerk</h1>
      <NetworkTabs />

      <BedrijvenListClient items={items} branches={branches} />
    </div>
  );
}
