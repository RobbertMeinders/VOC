import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Building2, Globe } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getSignedStorageUrl } from "@/lib/supabase/storage";
import { EmbedAutoHeight } from "@/components/embed/EmbedAutoHeight";
import { PopupLoginLink } from "@/components/embed/PopupLoginLink";
import { EntitySocialLinks } from "@/components/ui/EntitySocialLinks";

type PublicCompany = {
  id: string;
  slug: string;
  name: string;
  logo_url: string | null;
  tagline: string | null;
  description: string | null;
  industry: string | null;
  city: string | null;
  website: string | null;
  linkedin_url: string | null;
  instagram_url: string | null;
  facebook_url: string | null;
  employees: { id: string; first_name: string; last_name: string; job_title: string | null }[];
};

export const metadata: Metadata = { title: "VOC Bedrijvengids" };

// Publieke, nav-loze detailpagina — zelfde iframe-doel als /embed/bedrijven
// zelf. get_public_company() (0050_public_company_directory.sql) geeft
// notFound() al impliciet: een niet-opt-in of niet-bestaand bedrijf komt
// gewoon leeg terug.
export default async function BedrijfEmbedDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const supabase = await createClient();

  const { data } = await supabase.rpc("get_public_company", { p_slug: slug });
  const company = (data?.[0] ?? null) as PublicCompany | null;

  if (!company) notFound();

  const logoUrl = await getSignedStorageUrl("company-logos", company.logo_url);

  return (
    // Zie /embed/agenda/page.tsx voor waarom data-theme="light" + min-h-screen
    // hier samen nodig zijn (voorkomt de donkere balk die <body> anders
    // onderin liet doorschemeren bij een donker OS-thema).
    <div data-theme="light" className="min-h-screen bg-background">
      <div className="flex flex-col gap-4 p-4">
        <EmbedAutoHeight />
        <Link href="/embed/bedrijven" className="flex w-fit items-center gap-1.5 text-sm font-medium text-voc-red hover:underline">
          <ArrowLeft size={16} />
          Terug naar bedrijvengids
        </Link>

        <div className="flex items-center gap-4">
          {logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- publieke, external-embed pagina: geen framework-afhankelijkheden
            <img src={logoUrl} alt={company.name} className="h-20 w-20 shrink-0 rounded-2xl object-cover" />
          ) : (
            <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl bg-voc-red-light text-voc-red">
              <Building2 size={32} />
            </div>
          )}
          <div className="min-w-0">
            <h1 className="text-xl font-semibold text-foreground">{company.name}</h1>
            {(company.industry || company.city) && (
              <p className="mt-0.5 text-sm text-muted">{[company.industry, company.city].filter(Boolean).join(" · ")}</p>
            )}
            {company.tagline && <p className="mt-0.5 text-sm text-muted">{company.tagline}</p>}
          </div>
        </div>

        {company.description && <p className="whitespace-pre-line text-sm text-foreground">{company.description}</p>}

        {(company.website || company.linkedin_url || company.instagram_url || company.facebook_url) && (
          <div className="flex flex-wrap items-center gap-3">
            {company.website && (
              <a
                href={company.website}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-sm font-medium text-foreground hover:bg-black/[.04]"
              >
                <Globe size={14} />
                Website
              </a>
            )}
            {/* text-foreground: EntitySocialLinks' compact variant stelt zelf
                geen tekstkleur in (op de echte portaalpagina's altijd prima,
                want die volgen consequent hetzelfde thema) en erft daardoor
                hier de (op een donker OS-thema witte) kleur van <body> i.p.v.
                onze data-theme="light"-override — dat maakte de tekst
                onzichtbaar tot je eroverheen hoverde. */}
            <EntitySocialLinks
              linkedinUrl={company.linkedin_url}
              instagramUrl={company.instagram_url}
              facebookUrl={company.facebook_url}
              variant="compact"
              className="text-foreground"
            />
          </div>
        )}

        {company.employees.length > 0 && (
          <div className="rounded-2xl bg-surface p-4 shadow-sm">
            <p className="mb-2 text-sm font-semibold text-foreground">Werkzaam bij {company.name}</p>
            <ul className="flex flex-col gap-2">
              {company.employees.map((employee) => (
                <li key={employee.id}>
                  {/* Klik op een naam -> loginmuur, geen openbaar profiel (zie
                      de eerdere ontwerp-discussie). Pop-up i.p.v. target="_top":
                      zie PopupLoginLink voor waarom. */}
                  <PopupLoginLink
                    href={`/login?next=${encodeURIComponent(`/leden/${employee.id}`)}`}
                    className="text-sm text-voc-red hover:underline"
                  >
                    {employee.first_name} {employee.last_name}
                    {employee.job_title && <span className="text-muted"> — {employee.job_title}</span>}
                  </PopupLoginLink>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
