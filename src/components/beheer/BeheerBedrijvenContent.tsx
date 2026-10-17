import { requireBoard } from "@/lib/auth/session";
import { isAdmin } from "@/lib/auth/roles";
import { createClient } from "@/lib/supabase/server";
import { getSignedStorageUrls } from "@/lib/supabase/storage";
import { cachedQuery } from "@/lib/cache/queryCache";
import { PageHeader } from "@/components/ui/PageHeader";
import { BeheerBedrijvenListClient, type BeheerCompanyRow } from "@/components/beheer/BeheerBedrijvenListClient";
import { NewCompanyButton } from "@/components/beheer/NewCompanyButton";

type CompanyRow = { id: string; name: string; industry: string | null; city: string | null; logo_url: string | null };
type BillingRow = { company_id: string; vat_number: string | null };

// Snel overzicht voor beheer: elk bedrijf één klik van zijn bewerkformulier
// vandaan, i.p.v. eerst naar de publieke bedrijvenlijst en dan het profiel
// te moeten openen.
export async function BeheerBedrijvenContent() {
  const profile = await requireBoard();
  const supabase = await createClient();

  // requireBoard hierboven is de echte grens — elk bestuurslid ziet toch al
  // dezelfde, ongefilterde lijst (companies_members_select kent zelfs geen
  // rolvariatie), dus delen tussen viewers is veilig. Zoeken filtert nu
  // client-side (BeheerBedrijvenListClient), dus de cache blijft ongewijzigd.
  const [{ data: allCompanies }, { data: billingRows }] = await Promise.all([
    cachedQuery("beheer-bedrijven-page-data", 300_000, () =>
      supabase.from("companies").select("id, name, industry, city, logo_url").order("name").returns<CompanyRow[]>()
    ),
    // company_billing_details_member_select (0083) laat bestuur/beheer alle
    // rijen zien — hier alleen btw-nummer nodig, niet de rest van het
    // factuuradres, om te laten zien welke bedrijven nog niets hebben
    // ingevuld.
    cachedQuery("beheer-bedrijven-page-billing", 300_000, () =>
      supabase.from("company_billing_details").select("company_id, vat_number").returns<BillingRow[]>()
    ),
  ]);

  const logoUrls = await getSignedStorageUrls(
    supabase,
    "company-logos",
    (allCompanies ?? []).map((c) => c.logo_url)
  );

  const vatNumberByCompany = new Map((billingRows ?? []).map((b) => [b.company_id, b.vat_number]));

  const companies: BeheerCompanyRow[] = (allCompanies ?? []).map((c) => ({
    id: c.id,
    name: c.name,
    industry: c.industry,
    city: c.city,
    logoUrl: c.logo_url ? (logoUrls.get(c.logo_url) ?? null) : null,
    vatNumber: vatNumberByCompany.get(c.id) ?? null,
  }));

  return (
    <div>
      <PageHeader title="Bedrijven beheren" description="Bedrijfsprofiel snel aanpassen, direct vanuit dit overzicht." />

      <NewCompanyButton />

      <BeheerBedrijvenListClient companies={companies} canDelete={isAdmin(profile.role)} />
    </div>
  );
}
