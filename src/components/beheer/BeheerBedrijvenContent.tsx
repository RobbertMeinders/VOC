import { requireBoard } from "@/lib/auth/session";
import { isAdmin } from "@/lib/auth/roles";
import { createClient } from "@/lib/supabase/server";
import { getSignedStorageUrls } from "@/lib/supabase/storage";
import { cachedQuery } from "@/lib/cache/queryCache";
import { BeheerBedrijvenListClient, type BeheerCompanyRow } from "@/components/beheer/BeheerBedrijvenListClient";
import { NewCompanyButton } from "@/components/beheer/NewCompanyButton";

type CompanyRow = {
  id: string;
  name: string;
  industry: string | null;
  city: string | null;
  address: string | null;
  postal_code: string | null;
  logo_url: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
};
type BillingRow = {
  company_id: string;
  same_as_visit_address: boolean;
  invoice_address: string | null;
  invoice_postal_code: string | null;
  invoice_city: string | null;
  invoice_country: string;
  vat_number: string | null;
  invoice_email: string | null;
};

function joinAddress(parts: (string | null)[]): string {
  return parts.filter(Boolean).join(", ");
}

// Eén lijst i.p.v. een losse Overzicht/Factuurgegevens-tab — dat splitsen
// voegde in de praktijk weinig toe en betekende vooral tussen twee
// schermen heen en weer klikken voor dezelfde set bedrijven. Toont nu per
// bedrijf zowel de snel-bewerkbare profielvelden als het (resolved)
// factuuradres en btw-nummer uit company_billing_details (0083).
export async function BeheerBedrijvenContent() {
  const profile = await requireBoard();
  const supabase = await createClient();

  // requireBoard hierboven is de echte grens — elk bestuurslid ziet toch al
  // dezelfde, ongefilterde lijst, dus delen tussen viewers is veilig.
  // Zoeken filtert client-side (BeheerBedrijvenListClient), dus de cache
  // blijft ongewijzigd.
  const [{ data: allCompanies }, { data: billingRows }] = await Promise.all([
    cachedQuery("beheer-bedrijven-page-data", 300_000, () =>
      supabase
        .from("companies")
        .select("id, name, industry, city, address, postal_code, logo_url, phone, email, website")
        .order("name")
        .returns<CompanyRow[]>()
    ),
    // company_billing_details_member_select (0083) laat bestuur/beheer alle
    // rijen zien.
    cachedQuery("beheer-bedrijven-page-billing", 300_000, () =>
      supabase
        .from("company_billing_details")
        .select("company_id, same_as_visit_address, invoice_address, invoice_postal_code, invoice_city, invoice_country, vat_number, invoice_email")
        .returns<BillingRow[]>()
    ),
  ]);

  const logoUrls = await getSignedStorageUrls(
    supabase,
    "company-logos",
    (allCompanies ?? []).map((c) => c.logo_url)
  );

  const billingByCompany = new Map((billingRows ?? []).map((b) => [b.company_id, b]));

  const companies: BeheerCompanyRow[] = (allCompanies ?? []).map((c) => {
    const billing = billingByCompany.get(c.id) ?? null;
    const sameAsVisit = billing?.same_as_visit_address ?? true;

    const invoiceAddress = sameAsVisit
      ? joinAddress([c.address, joinAddress([c.postal_code, c.city])])
      : joinAddress([
          billing?.invoice_address ?? null,
          joinAddress([billing?.invoice_postal_code ?? null, billing?.invoice_city ?? null]),
          billing?.invoice_country ?? null,
        ]);

    return {
      id: c.id,
      name: c.name,
      industry: c.industry,
      city: c.city,
      logoUrl: c.logo_url ? (logoUrls.get(c.logo_url) ?? null) : null,
      phone: c.phone,
      email: c.email,
      website: c.website,
      invoiceAddress: invoiceAddress || null,
      effectiveEmail: billing?.invoice_email ?? c.email,
      vatNumber: billing?.vat_number ?? null,
    };
  });

  return (
    <div>
      <NewCompanyButton />

      <BeheerBedrijvenListClient companies={companies} canDelete={isAdmin(profile.role)} />
    </div>
  );
}
