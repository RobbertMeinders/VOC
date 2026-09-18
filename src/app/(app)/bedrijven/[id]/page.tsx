import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireProfile } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { getSignedStorageUrl, getSignedStorageUrls } from "@/lib/supabase/storage";
import { isBoard } from "@/lib/auth/roles";
import { CompanyHeader } from "@/components/company/CompanyHeader";
import { CompanyMemberList, type CompanyMember } from "@/components/company/CompanyMemberList";
import { CompanyForm } from "@/components/company/CompanyForm";
import type { Database } from "@/lib/types/database";

type Company = Database["public"]["Tables"]["companies"]["Row"];
type MemberRow = {
  profile: { id: string; first_name: string; last_name: string; job_title: string | null; avatar_url: string | null };
};

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const supabase = await createClient();
  const { data: company } = await supabase.from("companies").select("name").eq("id", id).maybeSingle();
  return { title: company?.name ?? "Bedrijf" };
}

export default async function CompanyPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const profile = await requireProfile();
  const supabase = await createClient();

  const { data: company } = await supabase.from("companies").select("*").eq("id", id).maybeSingle<Company>();

  if (!company) {
    notFound();
  }

  const { data: memberRows } = await supabase
    .from("company_members")
    .select("profile:profiles(id, first_name, last_name, job_title, avatar_url)")
    .eq("company_id", id)
    .returns<MemberRow[]>();

  const [logoUrl, avatarUrls] = await Promise.all([
    getSignedStorageUrl("company-logos", company.logo_url),
    getSignedStorageUrls(supabase, "avatars", (memberRows ?? []).map((row) => row.profile.avatar_url)),
  ]);

  const members: CompanyMember[] = (memberRows ?? []).map((row) => ({
    id: row.profile.id,
    first_name: row.profile.first_name,
    last_name: row.profile.last_name,
    job_title: row.profile.job_title,
    avatarUrl: row.profile.avatar_url ? (avatarUrls.get(row.profile.avatar_url) ?? null) : null,
  }));

  return (
    <div className="flex flex-col gap-6">
      <CompanyHeader company={company} logoUrl={logoUrl} />

      <div className="rounded-2xl border border-border bg-surface p-6 shadow-sm">
        <h2 className="mb-3 text-sm font-semibold text-foreground">Werkzaam bij dit bedrijf</h2>
        <CompanyMemberList members={members} />
      </div>

      {isBoard(profile.role) && (
        <div className="rounded-2xl border border-border bg-surface p-6 shadow-sm">
          <h2 className="mb-1 text-sm font-semibold text-foreground">Bedrijfsgegevens bewerken</h2>
          <p className="mb-4 text-xs text-muted">Alleen zichtbaar voor bestuur en beheer.</p>
          <CompanyForm company={company} logoUrl={logoUrl} />
        </div>
      )}
    </div>
  );
}
