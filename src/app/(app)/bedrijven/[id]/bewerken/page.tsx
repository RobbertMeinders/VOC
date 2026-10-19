import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { requireProfile } from "@/lib/auth/session";
import { isAdmin, isBoard } from "@/lib/auth/roles";
import { createClient } from "@/lib/supabase/server";
import { getSignedStorageUrl } from "@/lib/supabase/storage";
import { CompanyForm } from "@/components/company/CompanyForm";
import { CompanyBillingForm } from "@/components/company/CompanyBillingForm";
import { CompanyEditFormsGuard } from "@/components/company/CompanyEditFormsGuard";
import { BackLink } from "@/components/ui/BackLink";
import { DeleteButton } from "@/components/feed/DeleteButton";
import { deleteCompanyAction } from "@/app/(app)/bedrijven/[id]/actions";
import type { Database } from "@/lib/types/database";

type Company = Database["public"]["Tables"]["companies"]["Row"];
type CompanyBillingDetails = Database["public"]["Tables"]["company_billing_details"]["Row"];

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const supabase = await createClient();
  const { data: company } = await supabase.from("companies").select("name").eq("id", id).maybeSingle();
  return { title: company ? `${company.name} bewerken` : "Bedrijf bewerken" };
}

export default async function EditCompanyPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const profile = await requireProfile();
  const supabase = await createClient();

  const { data: company } = await supabase.from("companies").select("*").eq("id", id).maybeSingle<Company>();

  if (!company) {
    notFound();
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
      .eq("company_id", id)
      .eq("profile_id", profile.id);
    if (!count) {
      redirect(`/bedrijven/${id}`);
    }
  }

  const [logoUrl, { data: billing }] = await Promise.all([
    getSignedStorageUrl("company-logos", company.logo_url),
    supabase.from("company_billing_details").select("*").eq("company_id", id).maybeSingle<CompanyBillingDetails>(),
  ]);

  return (
    <div className="flex flex-col gap-4">
      <BackLink href={`/bedrijven/${id}`} label={`Terug naar ${company.name}`} />
      <div>
        <h1 className="font-display text-[1.75rem] font-extrabold tracking-[-0.03em] text-foreground sm:text-[2rem]">Bedrijfsgegevens bewerken</h1>
      </div>
      <CompanyEditFormsGuard>
        <div className="rounded-2xl border border-border bg-surface p-6 shadow-sm">
          <CompanyForm company={company} logoUrl={logoUrl} />
        </div>
        <div className="rounded-2xl border border-border bg-surface p-6 shadow-sm">
          <h2 className="mb-1 text-sm font-semibold text-foreground">Factuurgegevens</h2>
          <p className="mb-4 text-xs text-muted">Alleen zichtbaar voor jouw bedrijf en het bestuur.</p>
          <CompanyBillingForm company={company} billing={billing ?? null} />
        </div>
      </CompanyEditFormsGuard>
      {isAdmin(profile.role) && (
        <div className="rounded-2xl border border-border bg-surface p-6 shadow-sm">
          <h2 className="mb-1 text-sm font-semibold text-foreground">Bedrijf verwijderen</h2>
          <p className="mb-3 text-xs text-muted">
            Verwijdert dit bedrijf definitief, inclusief alle koppelingen met leden. Kan niet ongedaan gemaakt worden.
          </p>
          <DeleteButton
            onDelete={deleteCompanyAction.bind(null, company.id)}
            confirmMessage={`Weet je zeker dat je ${company.name} definitief wilt verwijderen?`}
            className="flex items-center gap-1.5 rounded-full border border-border bg-surface px-3 py-1.5 text-sm font-medium text-voc-red-text hover:border-voc-red"
            size={14}
          />
        </div>
      )}
    </div>
  );
}
