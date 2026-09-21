import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { requireBoard } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { getSignedStorageUrl } from "@/lib/supabase/storage";
import { CompanyForm } from "@/components/company/CompanyForm";
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
  await requireBoard();
  const supabase = await createClient();

  const { data: company } = await supabase.from("companies").select("*").eq("id", id).maybeSingle<Company>();

  if (!company) {
    notFound();
  }

  const logoUrl = await getSignedStorageUrl("company-logos", company.logo_url);

  return (
    <div className="flex flex-col gap-4">
      <Link href={`/bedrijven/${id}`} className="flex w-fit items-center gap-1.5 text-sm text-muted hover:text-voc-red">
        <ArrowLeft size={16} />
        Terug naar {company.name}
      </Link>
      <div>
        <h1 className="text-xl font-semibold text-foreground">Bedrijfsgegevens bewerken</h1>
        <p className="mt-0.5 text-sm text-muted">Alleen zichtbaar voor bestuur en beheer.</p>
      </div>
      <div className="rounded-2xl border border-border bg-surface p-6 shadow-sm">
        <CompanyForm company={company} logoUrl={logoUrl} />
      </div>
    </div>
  );
}
