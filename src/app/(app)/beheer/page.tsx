import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  Clock,
  Flag,
  Megaphone,
  MessageSquare,
  TrendingUp,
  UserPlus,
  Users,
} from "lucide-react";
import { requireBoard } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { ComingSoon } from "@/components/ui/ComingSoon";
import { AccessRequestRow, type AccessRequest } from "@/components/invitations/AccessRequestRow";
import { ApproveActivityForm } from "@/components/agenda/ApproveActivityForm";
import { RejectActivityForm } from "@/components/agenda/RejectActivityForm";
import { ReportRow, type ReportRowData } from "@/components/moderation/ReportRow";
import { CommunicationRow } from "@/components/beheer/CommunicationRow";
import { decideActivitySubmissionAction } from "@/app/(app)/agenda/actions";
import { extendInvitationAction } from "@/app/(app)/beheer/uitnodigingen/actions";
import { getAppSettings } from "@/lib/settings/app-settings";
import { formatActivityDate, formatRelativeTime } from "@/lib/format/date";
import type { Database } from "@/lib/types/database";

export const metadata: Metadata = { title: "Beheer" };

type Activity = Database["public"]["Tables"]["activities"]["Row"];
type ActivityWithCreator = Activity & { created_by_profile: { first_name: string; last_name: string } | null };
type Invitation = Database["public"]["Tables"]["invitations"]["Row"];
type NewMember = { id: string; first_name: string; last_name: string; avatar_url: string | null; created_at: string };
type RecentPost = {
  id: string;
  content: string | null;
  created_at: string;
  author: { first_name: string; last_name: string } | null;
};
type Communication = Database["public"]["Tables"]["communications"]["Row"] & { activity: { title: string } | null };
type ReportQueryRow = {
  id: string;
  reason: string;
  details: string | null;
  created_at: string;
  reporter: { first_name: string; last_name: string } | null;
  post: { id: string; content: string | null; author: { first_name: string; last_name: string } | null } | null;
};

const EXPIRING_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;
const NEW_MEMBER_WINDOW_MS = 30 * 24 * 60 * 60 * 1000;

function profileName(p: { first_name: string; last_name: string } | null): string {
  return p ? `${p.first_name} ${p.last_name}` : "Onbekend";
}

function toReportRowData(r: ReportQueryRow): ReportRowData {
  return {
    id: r.id,
    reason: r.reason,
    details: r.details,
    createdAt: r.created_at,
    reporterName: r.reporter ? `${r.reporter.first_name} ${r.reporter.last_name}` : "Een lid",
    post: r.post
      ? { id: r.post.id, content: r.post.content, authorName: r.post.author ? `${r.post.author.first_name} ${r.post.author.last_name}` : "Onbekend" }
      : null,
  };
}

export default async function BeheerPage() {
  await requireBoard();
  const supabase = await createClient();

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const thirtyDaysAgo = new Date(now.getTime() - NEW_MEMBER_WINDOW_MS).toISOString();
  const sevenDaysFromNow = new Date(now.getTime() + EXPIRING_WINDOW_MS).toISOString();

  const [
    { data: accessRequests },
    { data: pendingActivities },
    { data: openReportsRaw },
    { data: expiringInvitations },
    { data: upcomingActivities },
    { data: newMembers },
    { data: recentPosts },
    { data: draftCommunications },
    settings,
    { count: activeMemberCount },
    { count: totalProfileCount },
    { count: signupsThisMonth },
    { count: activeLast30Count },
  ] = await Promise.all([
    supabase.from("access_requests").select("*").eq("status", "pending").order("created_at", { ascending: false }).returns<AccessRequest[]>(),
    supabase
      .from("activities")
      .select("*, created_by_profile:profiles!activities_created_by_fkey(first_name, last_name)")
      .eq("status", "pending")
      .order("created_at", { ascending: false })
      .returns<ActivityWithCreator[]>(),
    supabase
      .from("feed_post_reports")
      .select(
        "id, reason, details, created_at, reporter:profiles!feed_post_reports_reporter_id_fkey(first_name, last_name), post:feed_posts(id, content, author:profiles!feed_posts_author_id_fkey(first_name, last_name))"
      )
      .eq("status", "open")
      .order("created_at", { ascending: false })
      .returns<ReportQueryRow[]>(),
    supabase
      .from("invitations")
      .select("*")
      .eq("status", "pending")
      .lte("expires_at", sevenDaysFromNow)
      .order("expires_at", { ascending: true })
      .returns<Invitation[]>(),
    supabase
      .from("activities")
      .select("*")
      .eq("status", "approved")
      .gte("starts_at", now.toISOString())
      .order("starts_at", { ascending: true })
      .limit(3)
      .returns<Activity[]>(),
    supabase
      .from("profiles")
      .select("id, first_name, last_name, avatar_url, created_at")
      .eq("is_active", true)
      .gte("created_at", thirtyDaysAgo)
      .order("created_at", { ascending: false })
      .returns<NewMember[]>(),
    supabase
      .from("feed_posts")
      .select("id, content, created_at, author:profiles!feed_posts_author_id_fkey(first_name, last_name)")
      .order("created_at", { ascending: false })
      .limit(3)
      .returns<RecentPost[]>(),
    supabase
      .from("communications")
      .select("*, activity:activities(title)")
      .neq("status", "verzonden")
      .order("created_at", { ascending: false })
      .limit(3)
      .returns<Communication[]>(),
    getAppSettings(),
    supabase.from("profiles").select("id", { count: "exact", head: true }).eq("is_active", true),
    supabase.from("profiles").select("id", { count: "exact", head: true }),
    supabase.from("profiles").select("id", { count: "exact", head: true }).gte("created_at", startOfMonth),
    supabase.from("profiles").select("id", { count: "exact", head: true }).eq("is_active", true).gte("last_active_at", thirtyDaysAgo),
  ]);

  // Twee dingen die pas bekend zijn ná de queries hierboven: of een nieuw
  // lid al aan een bedrijf gekoppeld is (company_members, niet op profiles
  // zelf) en hoeveel bevestigde aanmeldingen een aankomende activiteit al
  // heeft (activity_registrations, niet op activities zelf) — beide dus in
  // een tweede ronde, parallel aan elkaar.
  const newMemberIds = (newMembers ?? []).map((m) => m.id);
  const [{ data: linkedMembers }, registrationCounts] = await Promise.all([
    newMemberIds.length > 0
      ? supabase.from("company_members").select("profile_id").in("profile_id", newMemberIds)
      : Promise.resolve({ data: [] as { profile_id: string }[] }),
    Promise.all(
      (upcomingActivities ?? []).map((a) =>
        supabase.from("activity_registrations").select("id", { count: "exact", head: true }).eq("activity_id", a.id).eq("is_waitlisted", false)
      )
    ),
  ]);
  const linkedProfileIds = new Set((linkedMembers ?? []).map((l) => l.profile_id));

  const openReports = (openReportsRaw ?? []).map(toReportRowData);
  const activationRate = totalProfileCount ? Math.round(((activeMemberCount ?? 0) / totalProfileCount) * 100) : 0;

  const hasWaitingWork =
    (accessRequests?.length ?? 0) > 0 ||
    (pendingActivities?.length ?? 0) > 0 ||
    openReports.length > 0 ||
    (expiringInvitations?.length ?? 0) > 0;

  const kerncijfers = [
    { label: "Actieve leden", value: activeMemberCount ?? 0, icon: Users, href: "/beheer/leden" },
    { label: "Activatiegraad", value: `${activationRate}%`, icon: TrendingUp, href: "/beheer/leden" },
    { label: "Nieuwe aanmeldingen deze maand", value: signupsThisMonth ?? 0, icon: UserPlus, href: "/beheer/leden" },
    { label: "Actief laatste 30 dagen", value: activeLast30Count ?? 0, icon: Clock, href: "/beheer/leden" },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="mb-1 text-xl font-semibold text-foreground">Beheer</h1>
        <p className="text-sm text-muted">Overzicht voor bestuur en beheer.</p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {kerncijfers.map((stat) => {
          const Icon = stat.icon;
          return (
            <Link
              key={stat.label}
              href={stat.href}
              className="rounded-xl border border-border bg-surface p-4 shadow-sm transition-colors hover:border-voc-red"
            >
              <Icon size={16} className="mb-2 text-muted" />
              <p className="text-2xl font-semibold text-foreground">{stat.value}</p>
              <p className="text-xs text-muted">{stat.label}</p>
            </Link>
          );
        })}
      </div>

      <div className="rounded-2xl border border-border bg-surface p-4 shadow-sm">
        <h2 className="mb-3 text-sm font-semibold text-foreground">Wacht op jou</h2>

        {!hasWaitingWork && (
          <ComingSoon icon={CheckCircle2} title="Niets dat op je wacht" description="Nieuwe aanvragen, inzendingen en meldingen verschijnen hier." />
        )}

        {(accessRequests?.length ?? 0) > 0 && (
          <div className="mb-4">
            <p className="mb-1 flex items-center gap-1.5 text-xs font-medium text-muted">
              <UserPlus size={13} />
              Toegangsaanvragen ({accessRequests!.length})
            </p>
            <div className="rounded-xl border border-border px-3">
              {accessRequests!.map((request) => (
                <AccessRequestRow key={request.id} request={request} />
              ))}
            </div>
          </div>
        )}

        {(pendingActivities?.length ?? 0) > 0 && (
          <div className="mb-4">
            <p className="mb-1 flex items-center gap-1.5 text-xs font-medium text-muted">
              <CalendarDays size={13} />
              Activiteiten ter goedkeuring ({pendingActivities!.length})
            </p>
            <div className="flex flex-col gap-2">
              {pendingActivities!.map((activity) => (
                <div key={activity.id} className="rounded-xl border border-border p-3">
                  <Link href={`/agenda/${activity.id}`} className="text-sm font-medium text-foreground hover:text-voc-red-text">
                    {activity.title}
                  </Link>
                  <p className="text-xs text-muted">
                    {formatActivityDate(activity.starts_at)} · Aangeleverd door {profileName(activity.created_by_profile)}
                  </p>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <ApproveActivityForm
                      size="xs"
                      onApprove={async (notifyPush, notifyEmail) => {
                        "use server";
                        await decideActivitySubmissionAction(activity.id, "approved", undefined, notifyPush, notifyEmail);
                      }}
                    />
                    <RejectActivityForm
                      onReject={async (reason) => {
                        "use server";
                        await decideActivitySubmissionAction(activity.id, "rejected", reason);
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {openReports.length > 0 && (
          <div className="mb-4">
            <p className="mb-1 flex items-center gap-1.5 text-xs font-medium text-muted">
              <Flag size={13} />
              Openstaande rapportages ({openReports.length})
            </p>
            <div className="rounded-xl border border-border px-3">
              {openReports.map((report) => (
                <ReportRow key={report.id} report={report} />
              ))}
            </div>
          </div>
        )}

        {(expiringInvitations?.length ?? 0) > 0 && (
          <div>
            <p className="mb-1 flex items-center gap-1.5 text-xs font-medium text-muted">
              <Clock size={13} />
              Uitnodigingen die binnenkort verlopen ({expiringInvitations!.length})
            </p>
            <div className="flex flex-col gap-2">
              {expiringInvitations!.map((invitation) => (
                <div key={invitation.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border p-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-foreground">{invitation.email ?? "Geen e-mailadres"}</p>
                    <p className="text-xs text-muted">
                      Verloopt {invitation.expires_at ? formatRelativeTime(invitation.expires_at) : "binnenkort"}
                    </p>
                  </div>
                  <form action={extendInvitationAction.bind(null, invitation.id)}>
                    <button
                      type="submit"
                      className="flex shrink-0 items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-xs font-medium text-foreground hover:bg-black/[.04] dark:hover:bg-white/[.06]"
                    >
                      <Clock size={14} />
                      Verlengen
                    </button>
                  </form>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="rounded-2xl border border-border bg-surface p-4 shadow-sm">
        <div className="mb-3 flex items-center justify-between gap-2">
          <h2 className="text-sm font-semibold text-foreground">Komende activiteiten</h2>
          <Link href="/beheer/agenda" className="flex items-center gap-1 text-xs font-medium text-voc-red-text hover:underline">
            Hele agenda
            <ArrowRight size={13} />
          </Link>
        </div>

        {(upcomingActivities?.length ?? 0) > 0 ? (
          <div className="flex flex-col gap-2">
            {upcomingActivities!.map((activity, i) => {
              const confirmedCount = registrationCounts[i]?.count ?? 0;
              return (
                <Link
                  key={activity.id}
                  href={`/agenda/${activity.id}`}
                  className="flex items-center justify-between gap-3 rounded-xl border border-border p-3 hover:border-voc-red"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-foreground">{activity.title}</p>
                    <p className="text-xs text-muted">{formatActivityDate(activity.starts_at)}</p>
                  </div>
                  <span className="shrink-0 text-xs text-muted">
                    {confirmedCount}
                    {activity.max_participants ? ` / ${activity.max_participants}` : ""} aanmeldingen
                  </span>
                </Link>
              );
            })}
          </div>
        ) : (
          <p className="text-sm text-muted">Geen aankomende activiteiten.</p>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-2xl border border-border bg-surface p-4 shadow-sm">
          <div className="mb-3 flex items-center justify-between gap-2">
            <h2 className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
              <Users size={14} />
              Nieuwe leden
            </h2>
            <Link href="/beheer/leden" className="flex items-center gap-1 text-xs font-medium text-voc-red-text hover:underline">
              Alle leden
              <ArrowRight size={13} />
            </Link>
          </div>
          {(newMembers?.length ?? 0) > 0 ? (
            <div className="flex flex-col gap-2">
              {newMembers!.slice(0, 5).map((member) => {
                const incomplete = !member.avatar_url || !linkedProfileIds.has(member.id);
                return (
                  <Link key={member.id} href={`/leden/${member.id}`} className="flex items-center justify-between gap-2 py-1 hover:opacity-80">
                    <span className="truncate text-sm text-foreground">
                      {member.first_name} {member.last_name}
                    </span>
                    <span className="flex shrink-0 items-center gap-2">
                      {incomplete && (
                        <span className="rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700 dark:bg-amber-500/10 dark:text-amber-400">
                          Profiel incompleet
                        </span>
                      )}
                      <span className="text-xs text-muted">{formatRelativeTime(member.created_at)}</span>
                    </span>
                  </Link>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-muted">Geen nieuwe leden in de laatste 30 dagen.</p>
          )}
        </div>

        <div className="rounded-2xl border border-border bg-surface p-4 shadow-sm">
          <div className="mb-3 flex items-center justify-between gap-2">
            <h2 className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
              <MessageSquare size={14} />
              Community
            </h2>
            <Link href="/community" className="flex items-center gap-1 text-xs font-medium text-voc-red-text hover:underline">
              Naar de feed
              <ArrowRight size={13} />
            </Link>
          </div>
          {(recentPosts?.length ?? 0) > 0 ? (
            <div className="flex flex-col gap-2">
              {recentPosts!.map((post) => (
                <Link key={post.id} href={`/community?highlight=${post.id}`} className="block hover:opacity-80">
                  <p className="text-xs font-medium text-muted">{profileName(post.author)} · {formatRelativeTime(post.created_at)}</p>
                  <p className="line-clamp-2 text-sm text-foreground">{post.content}</p>
                </Link>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted">Nog geen berichten.</p>
          )}
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-surface p-4 shadow-sm">
        <div className="mb-3 flex items-center justify-between gap-2">
          <h2 className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
            <Megaphone size={14} />
            Nieuwsbrieven
          </h2>
          <Link href="/beheer/communicatie" className="flex items-center gap-1 text-xs font-medium text-voc-red-text hover:underline">
            Alle communicatie
            <ArrowRight size={13} />
          </Link>
        </div>
        {(draftCommunications?.length ?? 0) > 0 ? (
          <div className="flex flex-col gap-2">
            {draftCommunications!.map((c) => (
              <CommunicationRow key={c.id} communication={c} orgName={settings.org_name} logoUrl={settings.logo_url} />
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted">Geen concepten of ingeplande nieuwsbrieven.</p>
        )}
      </div>
    </div>
  );
}
