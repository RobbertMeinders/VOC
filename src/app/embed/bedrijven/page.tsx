import type { Metadata } from "next";
import Link from "next/link";
import { Building2 } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getSignedStorageUrls } from "@/lib/supabase/storage";
import { EmbedAutoHeight } from "@/components/embed/EmbedAutoHeight";

export const metadata: Metadata = { title: "VOC Bedrijvengids" };

type PublicCompany = {
  id: string;
  slug: string;
  name: string;
  logo_url: string | null;
  tagline: string | null;
  industry: string | null;
  city: string | null;
};

// Publieke, nav-loze pagina bedoeld voor een Elementor/WordPress-iframe op
// de VOC-website — zelfde opzet als /embed/agenda. get_public_companies()
// (0050_public_company_directory.sql) geeft alleen de expliciet voor de
// openbare site bedoelde velden terug van bedrijven die daar opt-in voor
// zijn (companies.is_publicly_visible) — nooit contactgegevens.
export default async function BedrijvenEmbedPage() {
  const supabase = await createClient();

  const { data } = await supabase.rpc("get_public_companies");
  const companies = (data ?? []) as PublicCompany[];

  const logoUrls = await getSignedStorageUrls(
    supabase,
    "company-logos",
    companies.map((c) => c.logo_url)
  );

  return (
    // Zie /embed/agenda/page.tsx voor waarom data-theme="light" + min-h-screen
    // hier samen nodig zijn (voorkomt de donkere balk die <body> anders
    // onderin liet doorschemeren bij een donker OS-thema).
    <div data-theme="light" className="min-h-screen bg-background">
      <div className="flex flex-col gap-6 p-4">
        <EmbedAutoHeight />
        <div>
          <h2 className="text-xl font-semibold text-foreground">Bedrijvengids</h2>
          <p className="mt-2 text-sm text-muted">
            De ondernemers van de Veendammer OndernemersCompagnie, van kennissessie tot netwerkborrel al aan tafel —
            hieronder een greep uit ons ledenbestand.
          </p>
        </div>

        {companies.length === 0 && <p className="py-4 text-center text-sm text-muted">Er zijn nog geen bedrijven te tonen.</p>}

        {companies.length > 0 && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {companies.map((company) => {
              const logoUrl = company.logo_url ? (logoUrls.get(company.logo_url) ?? null) : null;
              return (
                <Link
                  key={company.id}
                  href={`/embed/bedrijven/${company.slug}`}
                  className="flex items-center gap-3 overflow-hidden rounded-2xl bg-surface p-4 shadow-sm transition-all duration-500 ease-out hover:scale-[1.008] hover:shadow-md"
                >
                  {logoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element -- publieke, external-embed pagina: geen framework-afhankelijkheden
                    <img src={logoUrl} alt={company.name} className="h-14 w-14 shrink-0 rounded-xl object-cover" />
                  ) : (
                    <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-voc-red-light text-voc-red">
                      <Building2 size={24} />
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-foreground">{company.name}</p>
                    {(company.industry || company.city) && (
                      <p className="truncate text-xs text-muted">
                        {[company.industry, company.city].filter(Boolean).join(" · ")}
                      </p>
                    )}
                    {company.tagline && <p className="mt-0.5 truncate text-xs text-muted">{company.tagline}</p>}
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
