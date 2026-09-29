import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { getSignedStorageUrls } from "@/lib/supabase/storage";
import { EmbedAutoHeight } from "@/components/embed/EmbedAutoHeight";
import { BedrijvenEmbedList } from "./BedrijvenEmbedList";

export const metadata: Metadata = { title: "VOC Bedrijvengids" };

// Publieke, nav-loze pagina bedoeld voor een Elementor/WordPress-iframe op
// de VOC-website. Hergebruikt bewust dezelfde componenten als de interne
// /bedrijven-pagina (CompanyFilters, BedrijvenView incl. lijst/kaart-toggle)
// i.p.v. een eigen, sobere lijst — zo ziet de embed er ook echt hetzelfde
// uit als het portaal. get_public_companies() (0050/0053) geeft alleen de
// expliciet voor de openbare site bedoelde velden terug van bedrijven die
// daar (standaard) voor zichtbaar zijn (companies.is_publicly_visible) —
// nooit contactgegevens, en een kaart-locatie alleen als het bedrijf zelf
// ook z'n adres toont (companies.show_address).
export default async function BedrijvenEmbedPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; branche?: string }>;
}) {
  const { q, branche } = await searchParams;
  const supabase = await createClient();

  const { data } = await supabase.rpc("get_public_companies");
  const companies = data ?? [];

  const branches = Array.from(new Set(companies.map((c) => c.industry).filter((v): v is string => Boolean(v)))).sort(
    (a, b) => a.localeCompare(b)
  );

  const query = (q ?? "").trim().toLowerCase();
  const filtered = companies.filter((c) => {
    const matchesQuery = !query || c.name.toLowerCase().includes(query) || (c.city ?? "").toLowerCase().includes(query);
    const matchesBranche = !branche || c.industry === branche;
    return matchesQuery && matchesBranche;
  });

  const logoUrls = await getSignedStorageUrls(
    supabase,
    "company-logos",
    filtered.map((c) => c.logo_url)
  );

  const items = filtered.map((c) => ({
    id: c.id,
    slug: c.slug,
    name: c.name,
    industry: c.industry,
    city: c.city,
    logoUrl: c.logo_url ? (logoUrls.get(c.logo_url) ?? null) : null,
    tagline: c.tagline,
    latitude: c.latitude,
    longitude: c.longitude,
    href: `/embed/bedrijven/${c.slug}`,
  }));

  return (
    // Zie /embed/agenda/page.tsx voor waarom data-theme="light" + min-h-screen
    // hier samen nodig zijn (voorkomt de donkere balk die <body> anders
    // onderin liet doorschemeren bij een donker OS-thema).
    <div data-theme="light" className="min-h-screen bg-background">
      {/* De iframe zelf neemt de volle breedte van de website in (zie
          /beheer/embed-codes, fullWidth), zodat de verduistering achter een
          geopende overlay niet blijft steken in witte marges — de inhoud
          zelf blijft via deze max-w-wrapper gewoon mooi centraal staan. */}
      <div className="mx-auto max-w-5xl p-4">
        <EmbedAutoHeight />
        <BedrijvenEmbedList items={items} branches={branches} />
      </div>
    </div>
  );
}
