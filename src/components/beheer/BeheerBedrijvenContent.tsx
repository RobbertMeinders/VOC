import Link from "next/link";
import { ArrowRight } from "lucide-react";
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
  logo_thumb_url: string | null;
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
  const [{ data: allCompanies }, { data: billingRows }, { data: pendingRequestRows }] = await Promise.all([
    cachedQuery("beheer-bedrijven-page-data", 300_000, () =>
      supabase
        .from("companies")
        .select("id, name, industry, city, address, postal_code, logo_url, logo_thumb_url, phone, email, website")
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
    // Koppelverzoeken onder Aanvragen: afhandelen kan hier niet meer, maar
    // ongecached (i.p.v. de 300s-cache hierboven) tonen we wel een signaal
    // per bedrijf — dit mag niet achterlopen op een net ingediend verzoek.
    supabase.from("company_membership_requests").select("company_id").eq("status", "pending"),
  ]);

  // Thumbnail-paden in dezelfde batch-aanroep (performance-audit #1): de
  // lijst toont een logo van 36px, daar is de kleine versie (max 160px) ruim
  // genoeg voor. Een bedrijf zonder thumbnail valt terug op het volle logo.
  const logoUrls = await getSignedStorageUrls(
    supabase,
    "company-logos",
    (allCompanies ?? []).flatMap((c) => [c.logo_url, c.logo_thumb_url])
  );

  const billingByCompany = new Map((billingRows ?? []).map((b) => [b.company_id, b]));
  const pendingRequestsByCompany = new Map<string, number>();
  for (const r of pendingRequestRows ?? []) {
    pendingRequestsByCompany.set(r.company_id, (pendingRequestsByCompany.get(r.company_id) ?? 0) + 1);
  }
  const totalPendingRequests = pendingRequestRows?.length ?? 0;

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

    const logoPath = c.logo_thumb_url ?? c.logo_url;
    return {
      id: c.id,
      name: c.name,
      industry: c.industry,
      city: c.city,
      logoUrl: logoPath ? (logoUrls.get(logoPath) ?? null) : null,
      phone: c.phone,
      email: c.email,
      website: c.website,
      invoiceAddress: invoiceAddress || null,
      effectiveEmail: billing?.invoice_email ?? c.email,
      vatNumber: billing?.vat_number ?? null,
      pendingMembershipRequests: pendingRequestsByCompany.get(c.id) ?? 0,
    };
  });

  return (
    <div>
      {totalPendingRequests > 0 && (
        <Link
          href="/beheer/instroom?tab=koppelingen"
          className="mb-4 flex items-center gap-1.5 rounded-xl bg-petrol-soft px-4 py-3 text-sm font-medium text-petrol hover:underline"
        >
          {totalPendingRequests} {totalPendingRequests === 1 ? "koppelverzoek wacht" : "koppelverzoeken wachten"} · Bekijken in Aanvragen
          <ArrowRight size={14} />
        </Link>
      )}

      <NewCompanyButton />

      <BeheerBedrijvenListClient companies={companies} canDelete={isAdmin(profile.role)} />
    </div>
  );
}
