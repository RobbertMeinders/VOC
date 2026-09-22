import Link from "next/link";
import { Pencil } from "lucide-react";
import { requireBoard } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { getSignedStorageUrls } from "@/lib/supabase/storage";
import { CompanyLogo } from "@/components/company/CompanyLogo";

type CompanyRow = { id: string; name: string; industry: string | null; city: string | null; logo_url: string | null };

// Snel overzicht voor beheer: elk bedrijf één klik van zijn bewerkformulier
// vandaan, i.p.v. eerst naar de publieke bedrijvenlijst en dan het profiel
// te moeten openen.
export async function BeheerBedrijvenContent() {
  await requireBoard();
  const supabase = await createClient();

  const { data: companies } = await supabase
    .from("companies")
    .select("id, name, industry, city, logo_url")
    .order("name")
    .returns<CompanyRow[]>();

  const logoUrls = await getSignedStorageUrls(
    supabase,
    "company-logos",
    (companies ?? []).map((c) => c.logo_url)
  );

  return (
    <div>
      <h1 className="mb-1 text-xl font-semibold text-foreground">Bedrijven beheren</h1>
      <p className="mb-4 text-sm text-muted">Bedrijfsprofiel snel aanpassen, direct vanuit dit overzicht.</p>

      <div className="flex flex-col gap-2">
        {(companies ?? []).map((company) => (
          <div
            key={company.id}
            className="flex items-center gap-3 rounded-2xl border border-border bg-surface p-3 shadow-sm"
          >
            <CompanyLogo logoUrl={company.logo_url ? (logoUrls.get(company.logo_url) ?? null) : null} name={company.name} size={40} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-foreground">{company.name}</p>
              <p className="truncate text-xs text-muted">
                {company.industry}
                {company.industry && company.city && " · "}
                {company.city}
              </p>
            </div>
            <Link
              href={`/bedrijven/${company.id}/bewerken`}
              className="flex shrink-0 items-center gap-1.5 rounded-full border border-border bg-surface px-3 py-1.5 text-xs font-medium text-foreground hover:border-voc-red hover:text-voc-red"
            >
              <Pencil size={13} />
              Bewerken
            </Link>
          </div>
        ))}
      </div>
    </div>
  );
}
