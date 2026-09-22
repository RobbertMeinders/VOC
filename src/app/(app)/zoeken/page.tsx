import type { Metadata } from "next";
import Link from "next/link";
import { Search } from "lucide-react";
import { requireProfile } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { getSignedStorageUrls } from "@/lib/supabase/storage";
import { isBoard } from "@/lib/auth/roles";
import { formatActivityDate } from "@/lib/format/date";
import { SearchForm } from "@/components/search/SearchForm";
import { MemberRow, type MemberListItem } from "@/components/members/MemberRow";
import { CompanyCard, type CompanyListItem } from "@/components/company/CompanyCard";
import { DocumentRow } from "@/components/documents/DocumentRow";
import { ActivityCard } from "@/components/agenda/ActivityCard";
import { ComingSoon } from "@/components/ui/ComingSoon";
import type { Database } from "@/lib/types/database";

export const metadata: Metadata = { title: "Zoeken" };

type ProfileRow = {
  id: string;
  first_name: string;
  last_name: string;
  avatar_url: string | null;
  job_title: string | null;
  company_members: { is_primary: boolean; company: { id: string; name: string; industry: string | null } | null }[];
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
type ActivityRow = Database["public"]["Tables"]["activities"]["Row"];
type FeedPostRow = {
  id: string;
  content: string | null;
  created_at: string;
  author: { id: string; first_name: string; last_name: string } | null;
};

export default async function ZoekenPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const profile = await requireProfile();
  const { q } = await searchParams;
  const query = (q ?? "").trim();
  const supabase = await createClient();

  if (!query) {
    return (
      <div>
        <h1 className="mb-4 text-xl font-semibold text-foreground">Zoeken</h1>
        <SearchForm />
        <p className="mt-6 text-sm text-muted">Zoek in één keer in leden, bedrijven, activiteiten, berichten en documenten.</p>
      </div>
    );
  }

  // Begrensde ilike-queries per tabel i.p.v. alle rijen ophalen en
  // client-side filteren — bij een groeiend ledenbestand/documentenarchief
  // werd dat laatste bij elke zoekopdracht een steeds zwaardere volledige
  // tabel-scan over het netwerk.
  const like = `%${query}%`;
  // PostgREST's .or() splitst op komma's, dus die halen we uit de zoekterm
  // voor de meerdere-kolommen-varianten hieronder.
  const orLike = `%${query.replace(/,/g, " ")}%`;

  const [{ data: profileRows }, { data: companyRows }, { data: documentRows }, { data: activityRows }, { data: postRows }] =
    await Promise.all([
      supabase
        .from("profiles")
        .select(
          "id, first_name, last_name, avatar_url, job_title, company_members(is_primary, company:companies(id, name, industry))"
        )
        .or(`first_name.ilike.${orLike},last_name.ilike.${orLike}`)
        .returns<ProfileRow[]>(),
      supabase
        .from("companies")
        .select("id, name, industry, city, logo_url, tagline")
        .or(`name.ilike.${orLike},city.ilike.${orLike},tagline.ilike.${orLike}`)
        .returns<CompanyRow[]>(),
      supabase
        .from("documents")
        .select("*")
        .or(`title.ilike.${orLike},description.ilike.${orLike},category.ilike.${orLike}`)
        .returns<DocumentRowData[]>(),
      supabase
        .from("activities")
        .select("*")
        .or(`title.ilike.${orLike},location.ilike.${orLike},description.ilike.${orLike}`)
        .returns<ActivityRow[]>(),
      supabase
        .from("feed_posts")
        .select("id, content, created_at, author:profiles!feed_posts_author_id_fkey(id, first_name, last_name)")
        .ilike("content", like)
        .returns<FeedPostRow[]>(),
    ]);

  const matchedProfiles = profileRows ?? [];
  const matchedCompanies = companyRows ?? [];
  const matchedDocuments = documentRows ?? [];
  const matchedActivities = activityRows ?? [];
  const matchedPosts = postRows ?? [];

  const [avatarUrls, logoUrls, documentUrls, activityImageUrls, { data: allRegistrations }, { data: myRegistrations }] =
    await Promise.all([
      getSignedStorageUrls(supabase, "avatars", matchedProfiles.map((p) => p.avatar_url)),
      getSignedStorageUrls(supabase, "company-logos", matchedCompanies.map((c) => c.logo_url)),
      getSignedStorageUrls(supabase, "documents", matchedDocuments.map((d) => d.storage_path)),
      getSignedStorageUrls(supabase, "activity-images", matchedActivities.map((a) => a.image_url)),
      supabase.from("activity_registrations").select("activity_id, is_waitlisted"),
      supabase.from("activity_registrations").select("activity_id").eq("profile_id", profile.id),
    ]);

  const registeredIds = new Set((myRegistrations ?? []).map((r) => r.activity_id));
  const registrationCounts = new Map<string, number>();
  for (const registration of allRegistrations ?? []) {
    if (registration.is_waitlisted) continue;
    registrationCounts.set(registration.activity_id, (registrationCounts.get(registration.activity_id) ?? 0) + 1);
  }

  const members: MemberListItem[] = matchedProfiles.map((p) => {
    const membership = p.company_members.find((m) => m.is_primary) ?? p.company_members[0];
    return {
      id: p.id,
      first_name: p.first_name,
      last_name: p.last_name,
      avatarUrl: p.avatar_url ? (avatarUrls.get(p.avatar_url) ?? null) : null,
      jobTitle: p.job_title,
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

  const totalResults = members.length + companies.length + matchedDocuments.length + matchedActivities.length + matchedPosts.length;

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

          {matchedActivities.length > 0 && (
            <div>
              <h2 className="mb-2 text-sm font-semibold text-muted">Activiteiten ({matchedActivities.length})</h2>
              <div className="flex flex-col gap-3">
                {matchedActivities.map((activity) => (
                  <ActivityCard
                    key={activity.id}
                    activity={activity}
                    imageUrl={activity.image_url ? (activityImageUrls.get(activity.image_url) ?? null) : null}
                    registrationCount={registrationCounts.get(activity.id) ?? 0}
                    isRegistered={registeredIds.has(activity.id)}
                  />
                ))}
              </div>
            </div>
          )}

          {matchedPosts.length > 0 && (
            <div>
              <h2 className="mb-2 text-sm font-semibold text-muted">Berichten ({matchedPosts.length})</h2>
              <div className="flex flex-col gap-2">
                {matchedPosts.map((post) => (
                  <Link
                    key={post.id}
                    href="/community"
                    className="block rounded-2xl border border-border bg-surface p-4 shadow-sm hover:border-voc-red"
                  >
                    <p className="text-sm font-medium text-foreground">
                      {post.author ? `${post.author.first_name} ${post.author.last_name}` : "Onbekend lid"}
                    </p>
                    <p className="mt-1 line-clamp-2 text-sm text-muted">{post.content}</p>
                    <p className="mt-1 text-xs text-muted">{formatActivityDate(post.created_at)}</p>
                  </Link>
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
