import type { Metadata } from "next";
import { Search } from "lucide-react";
import { requireProfile } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { getSignedStorageUrls } from "@/lib/supabase/storage";
import { isBoard } from "@/lib/auth/roles";
import { SearchForm } from "@/components/search/SearchForm";
import { MemberRow, type MemberListItem } from "@/components/members/MemberRow";
import { CompanyCard, type CompanyListItem } from "@/components/company/CompanyCard";
import { DocumentRow } from "@/components/documents/DocumentRow";
import { ComingSoon } from "@/components/ui/ComingSoon";
import type { Database } from "@/lib/types/database";

export const metadata: Metadata = { title: "Zoeken" };

type ProfileRow = {
  id: string;
  first_name: string;
  last_name: string;
  avatar_url: string | null;
  company_members: { is_primary: boolean; company: { id: string; name: string } | null }[];
};
type CompanyRow = {
  id: string;
  name: string;
  industry: string | null;
  city: string | null;
  logo_url: string | null;
  tagline: string | null;
};
type DocumentRowData = Database["public"]["Tables"]["documents"]["Row"];

export default async function ZoekenPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const profile = await requireProfile();
  const { q } = await searchParams;
  const query = (q ?? "").trim().toLowerCase();
  const supabase = await createClient();

  if (!query) {
    return (
      <div>
        <h1 className="mb-4 text-xl font-semibold text-foreground">Zoeken</h1>
        <SearchForm />
        <p className="mt-6 text-sm text-muted">Zoek in één keer in leden, bedrijven en documenten.</p>
      </div>
    );
  }

  const [{ data: profileRows }, { data: companyRows }, { data: documentRows }] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, first_name, last_name, avatar_url, company_members(is_primary, company:companies(id, name))")
      .returns<ProfileRow[]>(),
    supabase.from("companies").select("id, name, industry, city, logo_url, tagline").returns<CompanyRow[]>(),
    supabase.from("documents").select("*").returns<DocumentRowData[]>(),
  ]);

  const matchedProfiles = (profileRows ?? []).filter((p) => `${p.first_name} ${p.last_name}`.toLowerCase().includes(query));
  const matchedCompanies = (companyRows ?? []).filter(
    (c) =>
      c.name.toLowerCase().includes(query) ||
      (c.city ?? "").toLowerCase().includes(query) ||
      (c.tagline ?? "").toLowerCase().includes(query)
  );
  const matchedDocuments = (documentRows ?? []).filter(
    (d) =>
      d.title.toLowerCase().includes(query) ||
      (d.description ?? "").toLowerCase().includes(query) ||
      (d.category ?? "").toLowerCase().includes(query)
  );

  const [avatarUrls, logoUrls, documentUrls] = await Promise.all([
    getSignedStorageUrls(supabase, "avatars", matchedProfiles.map((p) => p.avatar_url)),
    getSignedStorageUrls(supabase, "company-logos", matchedCompanies.map((c) => c.logo_url)),
    getSignedStorageUrls(supabase, "documents", matchedDocuments.map((d) => d.storage_path)),
  ]);

  const members: MemberListItem[] = matchedProfiles.map((p) => {
    const membership = p.company_members.find((m) => m.is_primary) ?? p.company_members[0];
    return {
      id: p.id,
      first_name: p.first_name,
      last_name: p.last_name,
      avatarUrl: p.avatar_url ? (avatarUrls.get(p.avatar_url) ?? null) : null,
      company: membership?.company ?? null,
    };
  });

  const companies: CompanyListItem[] = matchedCompanies.map((c) => ({
    id: c.id,
    name: c.name,
    industry: c.industry,
    city: c.city,
    tagline: c.tagline,
    logoUrl: c.logo_url ? (logoUrls.get(c.logo_url) ?? null) : null,
  }));

  const totalResults = members.length + companies.length + matchedDocuments.length;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="mb-4 text-xl font-semibold text-foreground">Zoeken</h1>
        <SearchForm />
      </div>

      {totalResults === 0 ? (
        <ComingSoon icon={Search} title="Niets gevonden" description={`Geen resultaten voor "${q}".`} />
      ) : (
        <>
          {members.length > 0 && (
            <div>
              <h2 className="mb-2 text-sm font-semibold text-muted">Leden ({members.length})</h2>
              <div className="grid gap-3 sm:grid-cols-2">
                {members.map((member) => (
                  <MemberRow key={member.id} member={member} />
                ))}
              </div>
            </div>
          )}

          {companies.length > 0 && (
            <div>
              <h2 className="mb-2 text-sm font-semibold text-muted">Bedrijven ({companies.length})</h2>
              <div className="grid gap-3 sm:grid-cols-2">
                {companies.map((company) => (
                  <CompanyCard key={company.id} company={company} />
                ))}
              </div>
            </div>
          )}

          {matchedDocuments.length > 0 && (
            <div>
              <h2 className="mb-2 text-sm font-semibold text-muted">Documenten ({matchedDocuments.length})</h2>
              <div className="flex flex-col gap-2">
                {matchedDocuments.map((doc) => (
                  <DocumentRow
                    key={doc.id}
                    document={doc}
                    url={documentUrls.get(doc.storage_path) ?? null}
                    canManage={isBoard(profile.role)}
                  />
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
