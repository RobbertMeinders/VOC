import { requireBoard } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { getSignedStorageUrls } from "@/lib/supabase/storage";
import { cachedQuery } from "@/lib/cache/queryCache";
import { BeheerFactuurgegevensListClient, type BeheerBillingRow } from "@/components/beheer/BeheerFactuurgegevensListClient";

type CompanyRow = {
  id: string;
  name: string;
  logo_url: string | null;
  address: string | null;
  postal_code: string | null;
  city: string | null;
  email: string | null;
  phone: string | null;
};
type BillingRow = {
  company_id: string;
  same_as_visit_address: boolean;
  invoice_name: string | null;
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

// Eigen overzicht specifiek voor de boekhouder (apart van Overzicht, zie
// 0083_company_billing_details.sql) — factuurgegevens horen niet tussen
// bedrijfsprofiel-velden als branche/plaats te staan, maar verdienen een
// eigen plek waar je in één keer alle btw-nummers/factuuradressen kunt
// nalopen i.p.v. per bedrijf te moeten klikken.
export async function BeheerFactuurgegevensContent() {
  await requireBoard();
  const supabase = await createClient();

  const [{ data: allCompanies }, { data: billingRows }] = await Promise.all([
    cachedQuery("beheer-bedrijven-page-data", 300_000, () =>
      supabase
        .from("companies")
        .select("id, name, logo_url, address, postal_code, city, email, phone")
        .order("name")
        .returns<CompanyRow[]>()
    ),
    // company_billing_details_member_select (0083) laat bestuur/beheer alle
    // rijen zien.
    cachedQuery("beheer-bedrijven-page-billing", 300_000, () =>
      supabase
        .from("company_billing_details")
        .select(
          "company_id, same_as_visit_address, invoice_name, invoice_address, invoice_postal_code, invoice_city, invoice_country, vat_number, invoice_email"
        )
        .returns<BillingRow[]>()
    ),
  ]);

  const logoUrls = await getSignedStorageUrls(
    supabase,
    "company-logos",
    (allCompanies ?? []).map((c) => c.logo_url)
  );

  const billingByCompany = new Map((billingRows ?? []).map((b) => [b.company_id, b]));

  const rows: BeheerBillingRow[] = (allCompanies ?? []).map((c) => {
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
      logoUrl: c.logo_url ? (logoUrls.get(c.logo_url) ?? null) : null,
      invoiceName: billing?.invoice_name ?? null,
      invoiceAddress: invoiceAddress || null,
      vatNumber: billing?.vat_number ?? null,
      invoiceEmail: billing?.invoice_email ?? null,
      generalEmail: c.email,
      phone: c.phone,
    };
  });

  return <BeheerFactuurgegevensListClient rows={rows} />;
}
