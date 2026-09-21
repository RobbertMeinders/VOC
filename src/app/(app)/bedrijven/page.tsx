import type { Metadata } from "next";
import { Building2 } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getSignedStorageUrls } from "@/lib/supabase/storage";
import { CompanyFilters } from "@/components/company/CompanyFilters";
import { CompanyCard } from "@/components/company/CompanyCard";
import { ComingSoon } from "@/components/ui/ComingSoon";

export const metadata: Metadata = { title: "Bedrijven" };

export default async function BedrijvenPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; branche?: string }>;
}) {
  const { q, branche } = await searchParams;
  const supabase = await createClient();

  const { data: companies } = await supabase
    .from("companies")
    .select("id, name, industry, city, logo_url, tagline")
    .order("name");

  const branches = Array.from(
    new Set((companies ?? []).map((c) => c.industry).filter((v): v is string => Boolean(v)))
  ).sort((a, b) => a.localeCompare(b));

  const query = (q ?? "").trim().toLowerCase();
  const filtered = (companies ?? []).filter((c) => {
    const matchesQuery =
      !query || c.name.toLowerCase().includes(query) || (c.city ?? "").toLowerCase().includes(query);
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
    name: c.name,
    industry: c.industry,
    city: c.city,
    logoUrl: c.logo_url ? (logoUrls.get(c.logo_url) ?? null) : null,
    tagline: c.tagline,
  }));

  return (
    <div>
      <h1 className="mb-4 text-xl font-semibold text-foreground">Bedrijven</h1>

      <CompanyFilters branches={branches} />

      {items.length > 0 ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((company) => (
            <CompanyCard key={company.id} company={company} />
          ))}
        </div>
      ) : (
        <ComingSoon
          icon={Building2}
          title="Geen bedrijven gevonden"
          description="Pas je zoekopdracht of filter aan."
        />
      )}
    </div>
  );
}
