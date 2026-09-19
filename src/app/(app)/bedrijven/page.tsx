import type { Metadata } from "next";
import { Building2 } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getSignedStorageUrls } from "@/lib/supabase/storage";
import { CompanyCard } from "@/components/company/CompanyCard";
import { ComingSoon } from "@/components/ui/ComingSoon";

export const metadata: Metadata = { title: "Bedrijven" };

export default async function BedrijvenPage() {
  const supabase = await createClient();

  const { data: companies } = await supabase
    .from("companies")
    .select("id, name, industry, city, logo_url")
    .order("name");

  const logoUrls = await getSignedStorageUrls(
    supabase,
    "company-logos",
    (companies ?? []).map((c) => c.logo_url)
  );

  const items = (companies ?? []).map((c) => ({
    id: c.id,
    name: c.name,
    industry: c.industry,
    city: c.city,
    logoUrl: c.logo_url ? (logoUrls.get(c.logo_url) ?? null) : null,
  }));

  return (
    <div>
      <h1 className="mb-4 text-xl font-semibold text-foreground">Bedrijven</h1>

      {items.length > 0 ? (
        <div className="grid gap-2 sm:grid-cols-2">
          {items.map((company) => (
            <CompanyCard key={company.id} company={company} />
          ))}
        </div>
      ) : (
        <ComingSoon icon={Building2} title="Nog geen bedrijven" description="Zodra leden een bedrijf koppelen, verschijnt het hier." />
      )}
    </div>
  );
}
