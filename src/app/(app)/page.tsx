import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { ArrowRight, CalendarDays, FileText, Inbox, MapPin } from "lucide-react";
import { requireProfile } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { getSignedStorageUrl, getSignedStorageUrls } from "@/lib/supabase/storage";
import { fetchFeedPosts } from "@/lib/feed/queries";
import { isBoard } from "@/lib/auth/roles";
import { formatActivityDate, formatActivityDateShort } from "@/lib/format/date";
import { POST_TYPE_BADGE_CLASS, POST_TYPE_LABELS } from "@/lib/feed/postType";
import { Avatar } from "@/components/ui/Avatar";
import { VocSocialLinks } from "@/components/ui/VocSocialLinks";
import { MentionedText } from "@/components/feed/MentionedText";
import { MemberRow, type MemberListItem } from "@/components/members/MemberRow";
import { CompanyCard, type CompanyListItem } from "@/components/company/CompanyCard";
import type { Database } from "@/lib/types/database";

export const metadata: Metadata = { title: "Home" };

type ActivityRow = Database["public"]["Tables"]["activities"]["Row"];
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

function EmptyHint({ text }: { text: string }) {
  return <p className="text-sm text-muted">{text}</p>;
}

export default async function HomePage() {
  const profile = await requireProfile();
  const supabase = await createClient();

  const [
    { data: activities },
    posts,
    { data: recentProfiles },
    { data: recentCompanyRows },
    { data: recentDocuments },
    stats,
  ] = await Promise.all([
    supabase
      .from("activities")
      .select("*")
      .eq("status", "approved")
      .gte("starts_at", new Date().toISOString())
      .order("starts_at", { ascending: true })
      .limit(3)
      .returns<ActivityRow[]>(),
    fetchFeedPosts(supabase, profile.id, 3),
    supabase
      .from("profiles")
      .select(
        "id, first_name, last_name, avatar_url, job_title, company_members(is_primary, company:companies(id, name, industry))"
      )
      .eq("is_active", true)
      .order("created_at", { ascending: false })
      .limit(3)
      .returns<ProfileRow[]>(),
    supabase
      .from("companies")
      .select("id, name, industry, city, logo_url, tagline")
      .order("created_at", { ascending: false })
      .limit(3)
      .returns<CompanyRow[]>(),
    supabase
      .from("documents")
      .select("id, title, category")
      .order("created_at", { ascending: false })
      .limit(4),
    isBoard(profile.role)
      ? Promise.all([
          supabase.from("access_requests").select("id", { count: "exact", head: true }).eq("status", "pending"),
          supabase.from("activities").select("id", { count: "exact", head: true }).eq("status", "pending"),
        ])
      : Promise.resolve(null),
  ]);

  const [nextActivity, ...upcomingRest] = activities ?? [];

  const [memberAvatarUrls, companyLogoUrls] = await Promise.all([
    getSignedStorageUrls(supabase, "avatars", (recentProfiles ?? []).map((p) => p.avatar_url)),
    getSignedStorageUrls(supabase, "company-logos", (recentCompanyRows ?? []).map((c) => c.logo_url)),
  ]);
  const nextActivityImageUrl = nextActivity ? await getSignedStorageUrl("activity-images", nextActivity.image_url) : null;

  const recentMembers: MemberListItem[] = (recentProfiles ?? []).map((p) => {
    const membership = p.company_members.find((m) => m.is_primary) ?? p.company_members[0];
    return {
      id: p.id,
      first_name: p.first_name,
      last_name: p.last_name,
      avatarUrl: p.avatar_url ? (memberAvatarUrls.get(p.avatar_url) ?? null) : null,
      jobTitle: p.job_title,
      company: membership?.company ?? null,
    };
  });

  const recentCompanies: CompanyListItem[] = (recentCompanyRows ?? []).map((c) => ({
    id: c.id,
    name: c.name,
    industry: c.industry,
    city: c.city,
    tagline: c.tagline,
    logoUrl: c.logo_url ? (companyLogoUrls.get(c.logo_url) ?? null) : null,
  }));

  const pendingRequests = stats ? (stats[0].count ?? 0) : 0;
  const pendingActivities = stats ? (stats[1].count ?? 0) : 0;
  const hasBoardActions = isBoard(profile.role) && (pendingRequests > 0 || pendingActivities > 0);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Welkom terug</h1>
        <p className="mt-0.5 text-sm text-muted">Dit gebeurt er binnen de VOC-community.</p>
      </div>

      {hasBoardActions && (
        <Link
          href="/beheer"
          className="flex items-center gap-3 rounded-2xl border border-voc-red/30 bg-voc-red-light p-4 text-sm font-medium text-voc-red shadow-sm hover:border-voc-red"
        >
          <Inbox size={18} />
          <span className="flex-1">
            {pendingRequests > 0 && `${pendingRequests} aanvra${pendingRequests === 1 ? "ag" : "gen"} wachten op beoordeling`}
            {pendingRequests > 0 && pendingActivities > 0 && " · "}
            {pendingActivities > 0 && `${pendingActivities} activiteit${pendingActivities === 1 ? "" : "en"} ter goedkeuring`}
          </span>
          <ArrowRight size={16} />
        </Link>
      )}

      {/* Eerstvolgende activiteit, prominent */}
      <section>
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-foreground">Eerstvolgende activiteit</h2>
          <Link href="/agenda" className="text-xs font-medium text-voc-red hover:underline">
            Hele agenda
          </Link>
        </div>
        {nextActivity ? (
          <Link
            href={`/agenda/${nextActivity.id}`}
            className="flex gap-4 rounded-2xl border border-border bg-surface p-5 shadow-sm hover:border-voc-red"
          >
            {nextActivityImageUrl ? (
              <Image
                src={nextActivityImageUrl}
                alt={nextActivity.title}
                width={96}
                height={96}
                className="h-24 w-24 shrink-0 rounded-xl object-cover"
              />
            ) : (
              <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-xl bg-voc-red-light text-voc-red">
                <CalendarDays size={30} />
              </div>
            )}
            <div className="min-w-0 flex-1">
              <p className="line-clamp-2 text-lg font-semibold leading-snug text-foreground">{nextActivity.title}</p>
              <p className="mt-1 text-sm text-muted">{formatActivityDate(nextActivity.starts_at)}</p>
              {nextActivity.location && (
                <p className="mt-0.5 flex items-center gap-1 truncate text-sm text-muted">
                  <MapPin size={14} />
                  {nextActivity.location}
                </p>
              )}
            </div>
          </Link>
        ) : (
          <div className="rounded-2xl border border-border bg-surface p-5 shadow-sm">
            <EmptyHint text="Er staat nog geen activiteit gepland." />
          </div>
        )}

        {upcomingRest.length > 0 && (
          <div className="mt-2 flex flex-col gap-2">
            {upcomingRest.map((activity) => (
              <Link
                key={activity.id}
                href={`/agenda/${activity.id}`}
                className="flex items-center gap-3 rounded-xl border border-border bg-surface p-3 text-sm shadow-sm hover:border-voc-red"
              >
                <CalendarDays size={16} className="shrink-0 text-voc-red" />
                <span className="min-w-0 flex-1 truncate font-medium text-foreground">{activity.title}</span>
                <span className="shrink-0 text-xs text-muted">{formatActivityDate(activity.starts_at)}</span>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* Recente community-posts */}
      <section>
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-foreground">Recent in de community</h2>
          <Link href="/community" className="text-xs font-medium text-voc-red hover:underline">
            Naar community
          </Link>
        </div>
        {posts.length > 0 ? (
          <div className="flex flex-col gap-2">
            {posts.map((post) => (
              <Link
                key={post.id}
                href="/community"
                className="flex items-start gap-3 rounded-xl border border-border bg-surface p-3 shadow-sm hover:border-voc-red"
              >
                <Avatar
                  firstName={post.author.first_name}
                  lastName={post.author.last_name}
                  avatarUrl={post.author.avatarUrl}
                  size={40}
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="truncate text-sm font-medium text-foreground">
                      {post.author.first_name} {post.author.last_name}
                    </p>
                    {post.type && (
                      <span
                        className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium ${POST_TYPE_BADGE_CLASS[post.type]}`}
                      >
                        {POST_TYPE_LABELS[post.type]}
                      </span>
                    )}
                  </div>
                  {post.content && (
                    <p className="mt-0.5 line-clamp-2 text-sm text-muted">
                      <MentionedText text={post.content} />
                    </p>
                  )}
                  <div className="mt-1 flex items-center gap-3 text-xs text-muted">
                    <span>{formatActivityDateShort(post.createdAt)}</span>
                    {post.likesCount > 0 && <span>{post.likesCount} vind-ik-leuks</span>}
                    {post.comments.length > 0 && <span>{post.comments.length} reacties</span>}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-border bg-surface p-5 shadow-sm">
            <EmptyHint text="Nog geen berichten in de community." />
          </div>
        )}
      </section>

      {/* Nieuwe leden/bedrijven */}
      <section className="grid gap-4 sm:grid-cols-2">
        <div>
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-foreground">Nieuwe leden</h2>
            <Link href="/leden" className="text-xs font-medium text-voc-red hover:underline">
              Alle leden
            </Link>
          </div>
          <div className="flex flex-col gap-2">
            {recentMembers.length > 0 ? (
              recentMembers.map((member) => <MemberRow key={member.id} member={member} />)
            ) : (
              <EmptyHint text="Nog geen leden." />
            )}
          </div>
        </div>

        <div>
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-foreground">Nieuwe bedrijven</h2>
            <Link href="/bedrijven" className="text-xs font-medium text-voc-red hover:underline">
              Alle bedrijven
            </Link>
          </div>
          <div className="flex flex-col gap-2">
            {recentCompanies.length > 0 ? (
              recentCompanies.map((company) => <CompanyCard key={company.id} company={company} />)
            ) : (
              <EmptyHint text="Nog geen bedrijven." />
            )}
          </div>
        </div>
      </section>

      {/* Documenten, compact */}
      {(recentDocuments ?? []).length > 0 && (
        <section>
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-foreground">Documenten</h2>
            <Link href="/documenten" className="text-xs font-medium text-voc-red hover:underline">
              Alle documenten
            </Link>
          </div>
          <div className="flex flex-wrap gap-2">
            {(recentDocuments ?? []).map((doc) => (
              <Link
                key={doc.id}
                href="/documenten"
                className="flex items-center gap-2 rounded-full border border-border bg-surface px-3 py-1.5 text-xs font-medium text-foreground shadow-sm hover:border-voc-red"
              >
                <FileText size={13} className="text-voc-red" />
                <span className="max-w-[160px] truncate">{doc.title}</span>
              </Link>
            ))}
          </div>
        </section>
      )}

      <div className="flex items-center gap-3 border-t border-border pt-4">
        <p className="text-xs text-muted">Volg de VOC:</p>
        <VocSocialLinks />
      </div>
    </div>
  );
}
