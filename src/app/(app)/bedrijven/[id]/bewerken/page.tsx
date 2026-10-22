import type { Metadata } from "next";
import { notFound, permanentRedirect, redirect } from "next/navigation";
import { requireProfile } from "@/lib/auth/session";
import { isBoard } from "@/lib/auth/roles";
import { createClient } from "@/lib/supabase/server";
import { getSignedStorageUrl } from "@/lib/supabase/storage";
import { companyHref, companyIdFilter, resolveCompanySlugAlias } from "@/lib/company/slug";
import { CompanyForm } from "@/components/company/CompanyForm";
import { CompanyBillingForm } from "@/components/company/CompanyBillingForm";
import { CompanyMembershipSection } from "@/components/company/CompanyMembershipSection";
import { CompanyEditFormsGuard } from "@/components/company/CompanyEditFormsGuard";
import { PageHeader } from "@/components/ui/PageHeader";
import type { Database } from "@/lib/types/database";

type Company = Database["public"]["Tables"]["companies"]["Row"];
type CompanyBillingDetails = Database["public"]["Tables"]["company_billing_details"]["Row"];

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const supabase = await createClient();
  const { data: company } = await supabase.from("companies").select("name").filter(...companyIdFilter(id)).maybeSingle();
  return { title: company ? `${company.name} bewerken` : "Bedrijf bewerken" };
}

export default async function EditCompanyPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: routeParam } = await params;
  const profile = await requireProfile();
  const supabase = await createClient();

  // companies_for_members (M8, sinds 0158 een security definer functie
  // i.p.v. view — Supabase-linter 0010): maskeert address/postal_code/
  // latitude/longitude voor wie geen lid van dit bedrijf of bestuur/beheer
  // is — de check vlak hieronder bepaalt of het formulier zelf getoond
  // wordt, maar de data zelf mag sowieso nooit ongemaskeerd naar de client.
  const { data: company } = await supabase
    .rpc("companies_for_members")
    .select("*")
    .filter(...companyIdFilter(routeParam))
    .maybeSingle<Company>();

  if (!company) {
    // Zelfde reden als CompanyProfileContent: routeParam kan een oude,
    // lelijke pre-backfill-slug zijn (company_slug_aliases, 0162/0163).
    const currentSlug = await resolveCompanySlugAlias(supabase, routeParam);
    if (currentSlug) {
      permanentRedirect(companyHref({ slug: currentSlug }, "/bewerken"));
    }
    notFound();
  }

  // URL-ronde: zelfde canonicalisatie als CompanyProfileContent — een oude,
  // rechtstreeks verstuurde UUID-link blijft werken maar stuurt door naar
  // de nette slug-URL.
  if (routeParam !== company.slug) {
    permanentRedirect(companyHref(company, "/bewerken"));
  }

  // Bewerken mag elk gekoppeld lid van dit bedrijf, of bestuur/beheer —
  // companies_member_update/companies_board_update (RLS) zijn de echte
  // poortwachter voor het opslaan zelf; dit is alleen om de pagina niet te
  // tonen aan wie hier toch niets mee kan. Geen notFound(): het bedrijf
  // bestaat gewoon, je mag 'm alleen niet bewerken.
  let isPrimaryContact = false;
  if (!isBoard(profile.role)) {
    const { data: memberRow } = await supabase
      .from("company_members")
      .select("is_primary")
      .eq("company_id", company.id)
      .eq("profile_id", profile.id)
      .maybeSingle();
    if (!memberRow) {
      redirect(companyHref(company));
    }
    isPrimaryContact = memberRow.is_primary;
  }

  const [logoUrl, coverUrl, { data: billing }] = await Promise.all([
    getSignedStorageUrl("company-logos", company.logo_url),
    getSignedStorageUrl("company-covers", company.cover_url),
    supabase.from("company_billing_details").select("*").eq("company_id", company.id).maybeSingle<CompanyBillingDetails>(),
  ]);

  return (
    <div className="flex flex-col gap-4">
      <PageHeader title="Bedrijfsgegevens bewerken" back={{ href: companyHref(company), label: `Terug naar ${company.name}` }} />
      <CompanyEditFormsGuard>
        <div className="rounded-2xl bg-surface p-6 shadow-sm">
          <CompanyForm company={company} logoUrl={logoUrl} coverUrl={coverUrl} />
        </div>
        <div className="rounded-2xl bg-surface p-6 shadow-sm">
          <h2 className="mb-1 text-sm font-semibold text-foreground">Factuurgegevens</h2>
          <p className="mb-4 text-xs text-muted">Alleen zichtbaar voor jouw bedrijf en het bestuur.</p>
          <CompanyBillingForm company={company} billing={billing ?? null} />
        </div>
        <div className="rounded-2xl bg-surface p-6 shadow-sm">
          <CompanyMembershipSection
            companyId={company.id}
            membershipStatus={company.membership_status}
            memberSince={company.member_since}
            membershipEndDate={company.membership_end_date}
            isPrimaryContact={isPrimaryContact}
            isBoard={isBoard(profile.role)}
          />
        </div>
      </CompanyEditFormsGuard>
    </div>
  );
}
