import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireBoard } from "@/lib/auth/session";
import { isAdmin } from "@/lib/auth/roles";
import { createClient } from "@/lib/supabase/server";
import { getSignedStorageUrl } from "@/lib/supabase/storage";
import { CompanyForm } from "@/components/company/CompanyForm";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { DeleteButton } from "@/components/feed/DeleteButton";
import { deleteCompanyAction } from "@/app/(app)/bedrijven/[id]/actions";
import type { Database } from "@/lib/types/database";

type Company = Database["public"]["Tables"]["companies"]["Row"];

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const supabase = await createClient();
  const { data: company } = await supabase.from("companies").select("name").eq("id", id).maybeSingle();
  return { title: company ? `${company.name} bewerken` : "Bedrijf bewerken" };
}

export default async function EditCompanyPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const profile = await requireBoard();
  const supabase = await createClient();

  const { data: company } = await supabase.from("companies").select("*").eq("id", id).maybeSingle<Company>();

  if (!company) {
    notFound();
  }

  const logoUrl = await getSignedStorageUrl("company-logos", company.logo_url);

  return (
    <div className="flex flex-col gap-4">
      <Breadcrumbs
        items={[{ label: "Bedrijven", href: "/bedrijven" }, { label: company.name, href: `/bedrijven/${id}` }, { label: "Bewerken" }]}
      />
      <div>
        <h1 className="text-xl font-semibold text-foreground">Bedrijfsgegevens bewerken</h1>
        <p className="mt-0.5 text-sm text-muted">Alleen zichtbaar voor bestuur en beheer.</p>
      </div>
      <div className="rounded-2xl border border-border bg-surface p-6 shadow-sm">
        <CompanyForm company={company} logoUrl={logoUrl} />
      </div>
      {isAdmin(profile.role) && (
        <div className="rounded-2xl border border-border bg-surface p-6 shadow-sm">
          <h2 className="mb-1 text-sm font-semibold text-foreground">Bedrijf verwijderen</h2>
          <p className="mb-3 text-xs text-muted">
            Verwijdert dit bedrijf definitief, inclusief alle koppelingen met leden. Kan niet ongedaan gemaakt worden.
          </p>
          <DeleteButton
            onDelete={deleteCompanyAction.bind(null, company.id)}
            confirmMessage={`Weet je zeker dat je ${company.name} definitief wilt verwijderen?`}
            className="flex items-center gap-1.5 rounded-full border border-border bg-surface px-3 py-1.5 text-sm font-medium text-voc-red hover:border-voc-red"
            size={14}
          />
        </div>
      )}
    </div>
  );
}
