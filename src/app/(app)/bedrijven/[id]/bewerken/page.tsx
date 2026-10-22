import type { Metadata } from "next";
import { notFound, permanentRedirect, redirect } from "next/navigation";
import { requireProfile } from "@/lib/auth/session";
import { isAdmin, isBoard } from "@/lib/auth/roles";
import { createClient } from "@/lib/supabase/server";
import { getSignedStorageUrl } from "@/lib/supabase/storage";
import { companyHref, companyIdFilter, resolveCompanySlugAlias } from "@/lib/company/slug";
import { CompanyForm } from "@/components/company/CompanyForm";
import { CompanyBillingForm } from "@/components/company/CompanyBillingForm";
import { CompanyEditFormsGuard } from "@/components/company/CompanyEditFormsGuard";
import { PageHeader } from "@/components/ui/PageHeader";
import { DeleteButton } from "@/components/feed/DeleteButton";
import { deleteCompanyAction } from "@/app/(app)/bedrijven/[id]/actions";
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
  if (!isBoard(profile.role)) {
    const { count } = await supabase
      .from("company_members")
      .select("id", { count: "exact", head: true })
      .eq("company_id", company.id)
      .eq("profile_id", profile.id);
    if (!count) {
      redirect(companyHref(company));
    }
  }

  const [logoUrl, { data: billing }] = await Promise.all([
    getSignedStorageUrl("company-logos", company.logo_url),
    supabase.from("company_billing_details").select("*").eq("company_id", company.id).maybeSingle<CompanyBillingDetails>(),
  ]);

  return (
    <div className="flex flex-col gap-4">
      <PageHeader title="Bedrijfsgegevens bewerken" back={{ href: companyHref(company), label: `Terug naar ${company.name}` }} />
      <CompanyEditFormsGuard>
        <div className="rounded-2xl bg-surface p-6 shadow-sm">
          <CompanyForm company={company} logoUrl={logoUrl} />
        </div>
        <div className="rounded-2xl bg-surface p-6 shadow-sm">
          <h2 className="mb-1 text-sm font-semibold text-foreground">Factuurgegevens</h2>
          <p className="mb-4 text-xs text-muted">Alleen zichtbaar voor jouw bedrijf en het bestuur.</p>
          <CompanyBillingForm company={company} billing={billing ?? null} />
        </div>
      </CompanyEditFormsGuard>
      {isAdmin(profile.role) && (
        <div className="rounded-2xl bg-surface p-6 shadow-sm">
          <h2 className="mb-1 text-sm font-semibold text-foreground">Bedrijf verwijderen</h2>
          <p className="mb-3 text-xs text-muted">
            Verwijdert dit bedrijf definitief, inclusief alle koppelingen met leden. Kan niet ongedaan gemaakt worden.
          </p>
          <DeleteButton
            onDelete={deleteCompanyAction.bind(null, company.id)}
            confirmMessage={`Weet je zeker dat je ${company.name} definitief wilt verwijderen?`}
            className="flex items-center gap-1.5 rounded-full border border-border bg-surface px-3 py-1.5 text-sm font-medium text-voc-red-text hover:border-muted"
            size={14}
          />
        </div>
      )}
    </div>
  );
}
