import { Suspense } from "react";
import Link from "next/link";
import { Pencil } from "lucide-react";
import { requireBoard } from "@/lib/auth/session";
import { isAdmin } from "@/lib/auth/roles";
import { createClient } from "@/lib/supabase/server";
import { getSignedStorageUrls } from "@/lib/supabase/storage";
import { cachedQuery } from "@/lib/cache/queryCache";
import { CompanyLogo } from "@/components/company/CompanyLogo";
import { DeleteButton } from "@/components/feed/DeleteButton";
import { DocumentSearch } from "@/components/documents/DocumentSearch";
import { deleteCompanyAction } from "@/app/(app)/bedrijven/[id]/actions";

type CompanyRow = { id: string; name: string; industry: string | null; city: string | null; logo_url: string | null };

// Snel overzicht voor beheer: elk bedrijf één klik van zijn bewerkformulier
// vandaan, i.p.v. eerst naar de publieke bedrijvenlijst en dan het profiel
// te moeten openen.
export async function BeheerBedrijvenContent({ searchParams }: { searchParams?: Promise<{ q?: string }> }) {
  const profile = await requireBoard();
  const { q } = (await searchParams) ?? {};
  const supabase = await createClient();

  // requireBoard hierboven is de echte grens — elk bestuurslid ziet toch al
  // dezelfde, ongefilterde lijst (companies_members_select kent zelfs geen
  // rolvariatie), dus delen tussen viewers is veilig. Zoeken (q) filtert
  // hierna alsnog in JS, dus de cache zelf blijft per q ongewijzigd.
  const { data: allCompanies } = await cachedQuery("beheer-bedrijven-page-data", 300_000, () =>
    supabase.from("companies").select("id, name, industry, city, logo_url").order("name").returns<CompanyRow[]>()
  );

  const query = (q ?? "").trim().toLowerCase();
  const companies = query
    ? (allCompanies ?? []).filter(
        (c) =>
          c.name.toLowerCase().includes(query) ||
          (c.industry ?? "").toLowerCase().includes(query) ||
          (c.city ?? "").toLowerCase().includes(query)
      )
    : allCompanies;

  const logoUrls = await getSignedStorageUrls(
    supabase,
    "company-logos",
    (companies ?? []).map((c) => c.logo_url)
  );

  return (
    <div>
      <h1 className="mb-1 text-xl font-semibold text-foreground">Bedrijven beheren</h1>
      <p className="mb-4 text-sm text-muted">Bedrijfsprofiel snel aanpassen, direct vanuit dit overzicht.</p>

      {(allCompanies ?? []).length > 0 && (
        <Suspense>
          <DocumentSearch placeholder="Zoek op bedrijfsnaam, branche of plaats…" />
        </Suspense>
      )}

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
              aria-label="Bewerken"
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-border bg-surface text-foreground hover:border-voc-red hover:text-voc-red"
            >
              <Pencil size={13} />
            </Link>
            {isAdmin(profile.role) && (
              <DeleteButton
                onDelete={deleteCompanyAction.bind(null, company.id, false)}
                confirmMessage={`Weet je zeker dat je ${company.name} definitief wilt verwijderen?`}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-border bg-surface text-voc-red hover:border-voc-red"
                size={13}
              />
            )}
          </div>
        ))}
        {(companies ?? []).length === 0 && <p className="text-sm text-muted">Geen bedrijven gevonden.</p>}
      </div>
    </div>
  );
}
