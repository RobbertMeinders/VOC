import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getSignedStorageUrls, publicLogoUrl } from "@/lib/supabase/storage";
import { EmbedAutoHeight } from "@/components/embed/EmbedAutoHeight";
import { CompanyDetailContent, type CompanyDetailData } from "@/components/embed/CompanyDetailContent";

export const metadata: Metadata = { title: "VOC Bedrijvengids" };

// Publieke, nav-loze detailpagina — bereikbaar als directe/gedeelde link en
// als progressive-enhancement-fallback (rechtsklik/nieuw tabblad/geen JS)
// achter elke bedrijfskaart in /embed/bedrijven. Bij een normale klik
// (JS aan) onderschept BedrijvenEmbedList de navigatie en toont in plaats
// daarvan een in-page overlay via hetzelfde /api/embed/companies/[slug]
// endpoint — zie CompanyDetailOverlay voor waarom die niet gewoon naar
// deze pagina navigeert. get_public_company() (0050_public_company_directory.sql)
// geeft notFound() al impliciet: een niet-opt-in of niet-bestaand bedrijf
// komt gewoon leeg terug.
export default async function BedrijfEmbedDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const supabase = await createClient();

  const { data } = await supabase.rpc("get_public_company", { p_slug: slug });
  const company = data?.[0] ?? null;

  if (!company) notFound();

  const avatarUrls = await getSignedStorageUrls(
    supabase,
    "avatars",
    company.employees.map((e) => e.avatar_url)
  );

  const detail: CompanyDetailData = {
    name: company.name,
    logoUrl: publicLogoUrl(company.logo_url),
    tagline: company.tagline,
    description: company.description,
    industry: company.industry,
    city: company.city,
    address: company.address,
    postalCode: company.postal_code,
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

  return (
    // Zie /embed/agenda/page.tsx voor waarom data-theme="light" + min-h-screen
    // hier samen nodig zijn (voorkomt de donkere balk die <body> anders
    // onderin liet doorschemeren bij een donker OS-thema).
    <div data-theme="light" className="min-h-screen bg-surface">
      {/* Zie /embed/bedrijven/page.tsx voor waarom deze max-w-wrapper hier
          staat. */}
      <div className="mx-auto flex max-w-5xl flex-col gap-4 p-4">
        <EmbedAutoHeight />
        <Link href="/embed/bedrijven" className="flex w-fit items-center gap-1.5 text-sm font-medium text-voc-red-text hover:underline">
          <ArrowLeft size={16} />
          Terug naar bedrijvengids
        </Link>

        <CompanyDetailContent company={detail} />
      </div>
    </div>
  );
}
