import type { Metadata } from "next";
import { requireProfile } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { getSignedStorageUrls } from "@/lib/supabase/storage";
import { cachedQuery } from "@/lib/cache/queryCache";
import { BedrijvenListClient, type SearchableCompany } from "@/components/company/BedrijvenListClient";
import { NetworkTabs } from "@/components/layout/NetworkTabs";
import { AddressVisibilityPrompt } from "@/components/company/AddressVisibilityPrompt";

export const metadata: Metadata = { title: "Bedrijven" };

type MembershipRow = { company_id: string; profile: { first_name: string; last_name: string } | null };
type OwnCompanyMapPromptRow = {
  company: {
    id: string;
    slug: string;
    address: string | null;
    show_address: boolean;
    address_visibility_prompt_dismissed_at: string | null;
    latitude: number | null;
    longitude: number | null;
  } | null;
};

export default async function BedrijvenPage() {
  const supabase = await createClient();
  const profile = await requireProfile();

  // Zichtbaarheid is voor elk actief lid identiek (companies_members_select
  // kent geen per-gebruiker variatie), dus dit resultaat delen tussen
  // leden/requests is veilig — get_companies_directory() (M8) maskeert
  // latitude/longitude daarom ook alleen op show_address, nooit op wie de
  // kijker zelf is (dat zou dit gedeelde cache-resultaat tussen viewers met
  // verschillende rechten laten lekken).
  const [{ data: companies }, { data: memberships }, { count: ledenCount }] = await cachedQuery("bedrijven-page-data", 60_000, () =>
    Promise.all([
      supabase.rpc("get_companies_directory"),
      // UX-review Z4: bedrijven ook doorzoekbaar op de namen van de mensen
      // die er werken — alleen gebruikt om op te matchen, niet getoond.
      supabase.from("company_members").select("company_id, profile:profiles(first_name, last_name)").returns<MembershipRow[]>(),
      // Alleen voor het aantal op de Leden-schakelaar hiernaast — head-only
      // telling i.p.v. de volledige ledenlijst ophalen.
      supabase
        .from("profiles")
        .select("id", { count: "exact", head: true })
        .eq("is_organization_account", false)
        .eq("is_active", true),
    ])
  );

  const branches = Array.from(
    new Set((companies ?? []).map((c) => c.industry).filter((v): v is string => Boolean(v)))
  ).sort((a, b) => a.localeCompare(b));

  // Lidmaatschap-traject Deel 3, kaart-prompt: eigen, NIET-gecachte query
  // (bewust los van de gedeelde cachedQuery hierboven — die is expliciet
  // viewer-onafhankelijk, en of DEZE kijker zelf een bedrijf beheert is dat
  // per definitie niet). Alleen relevant als het eigen bedrijf een locatie
  // heeft maar door het verborgen adres niet op de kaart staat.
  const { data: ownCompanyRows } = await supabase
    .from("company_members")
    .select(
      "company:companies(id, slug, address, show_address, address_visibility_prompt_dismissed_at, latitude, longitude)"
    )
    .eq("profile_id", profile.id)
    .returns<OwnCompanyMapPromptRow[]>();
  const ownCompanyForMapPrompt = (ownCompanyRows ?? [])
    .map((row) => row.company)
    .find((c) => c && !c.show_address && !c.address_visibility_prompt_dismissed_at && c.latitude !== null && c.longitude !== null);

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
      slug: c.slug,
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
      <NetworkTabs ledenCount={ledenCount ?? 0} bedrijvenCount={companies?.length ?? 0} />

      {ownCompanyForMapPrompt && (
        <div className="mb-4">
          <AddressVisibilityPrompt
            companyId={ownCompanyForMapPrompt.id}
            companySlug={ownCompanyForMapPrompt.slug}
            address={ownCompanyForMapPrompt.address}
            message="Je bezoekersadres staat op verborgen. Mogen andere leden het op de kaart zien?"
          />
        </div>
      )}

      <BedrijvenListClient items={items} branches={branches} />
    </div>
  );
}
