import type { Metadata } from "next";
import Link from "next/link";
import { requireBoard } from "@/lib/auth/session";
import { BackLink } from "@/components/ui/BackLink";
import {
  getActivityStats,
  getCommunityStats,
  getNotificationStats,
  getOverviewStats,
} from "@/lib/statistics/queries";

export const metadata: Metadata = { title: "Statistieken" };

const TABS = [
  { key: "overzicht", label: "Overzicht" },
  { key: "community", label: "Community" },
  { key: "activiteiten", label: "Activiteiten" },
  { key: "notificaties", label: "Notificaties" },
] as const;

type TabKey = (typeof TABS)[number]["key"];

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl border border-border bg-surface p-4 shadow-sm">
      <p className="text-2xl font-semibold text-foreground">{value}</p>
      <p className="text-xs text-muted">{label}</p>
    </div>
  );
}

async function OverviewTab() {
  const stats = await getOverviewStats();
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      <StatCard label="Aantal leden" value={stats.totalMembers} />
      <StatCard label="Actieve leden" value={stats.activeMembers} />
      <StatCard label="Actieve pushabonnementen" value={stats.activePushSubscriptions} />
      <StatCard label="Leden met push" value={`${stats.pushPercentage}%`} />
      <StatCard label="Nieuwe leden (30d)" value={stats.newMembers} />
      <StatCard label="Nieuwe bedrijven (30d)" value={stats.newCompanies} />
      <StatCard label="Aankomende activiteiten" value={stats.upcomingActivities} />
    </div>
  );
}

async function CommunityTab() {
  const stats = await getCommunityStats();
  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="Aantal berichten" value={stats.totalPosts} />
        <StatCard label="Unieke leden die bekeken" value={stats.uniqueViewers} />
        <StatCard label="Likes" value={stats.totalLikes} />
        <StatCard label="Reacties" value={stats.totalComments} />
      </div>
      <div className="rounded-2xl border border-border bg-surface p-4 shadow-sm">
        <h2 className="mb-2 text-sm font-semibold text-foreground">Meest bekeken berichten</h2>
        {stats.topPosts.length === 0 ? (
          <p className="text-sm text-muted">Nog geen bekeken berichten via een genoemde link.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {stats.topPosts.map((post) => (
              <li key={post.id} className="flex items-center justify-between gap-3 text-sm">
                <span className="truncate text-foreground">{post.excerpt}</span>
                <span className="shrink-0 text-muted">{post.views}x</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

async function ActiviteitenTab() {
  const stats = await getActivityStats();
  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="Aantal activiteiten" value={stats.totalActivities} />
        <StatCard label="Unieke leden die bekeken" value={stats.uniqueViewers} />
        <StatCard label="Aanmeldingen" value={stats.totalRegistrations} />
        <StatCard label="Aanwezigen" value={stats.totalAttendees} />
        <StatCard
          label="Bekeken → aangemeld"
          value={stats.viewToRegistrationPercentage === null ? "—" : `${stats.viewToRegistrationPercentage}%`}
        />
      </div>
      <div className="rounded-2xl border border-border bg-surface p-4 shadow-sm">
        <h2 className="mb-2 text-sm font-semibold text-foreground">Meest bekeken activiteiten</h2>
        {stats.topActivities.length === 0 ? (
          <p className="text-sm text-muted">Nog geen bekeken activiteiten.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {stats.topActivities.map((activity) => (
              <li key={activity.id} className="flex items-center justify-between gap-3 text-sm">
                <span className="truncate text-foreground">{activity.title}</span>
                <span className="shrink-0 text-muted">{activity.views}x</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

async function NotificatiesTab() {
  const stats = await getNotificationStats();
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      <StatCard label="Actieve pushabonnementen" value={stats.activePushSubscriptions} />
      <StatCard label="Leden met push" value={`${stats.pushPercentage}%`} />
      <StatCard label="Nieuwe abonnementen (30d)" value={stats.newPushSubscriptions} />
      <StatCard label="Opgezegde abonnementen (30d)" value={stats.unsubscribedPushSubscriptions} />
      <StatCard label="Verzonden pushmeldingen (30d)" value={stats.pushesSent} />
      <StatCard label="Geopende pushmeldingen (30d)" value={stats.pushesOpened} />
      <StatCard label="Verzonden e-mails (30d)" value={stats.emailsSent} />
      <StatCard label="Geopende e-mails (30d)" value={stats.emailsOpened} />
    </div>
  );
}

export default async function StatistiekenPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  await requireBoard();
  const { tab } = await searchParams;
  const activeTab: TabKey = TABS.some((t) => t.key === tab) ? (tab as TabKey) : "overzicht";

  return (
    <div className="flex flex-col gap-4">
      <BackLink href="/beheer" label="Terug naar Beheer" />
      <div>
        <h1 className="text-xl font-semibold text-foreground">Statistieken</h1>
        <p className="text-sm text-muted">Belangrijkste cijfers over leden, community, activiteiten en notificaties.</p>
      </div>

      <div className="flex gap-1.5 overflow-x-auto">
        {TABS.map((t) => (
          <Link
            key={t.key}
            href={`/beheer/statistieken?tab=${t.key}`}
            className={`shrink-0 rounded-full px-3 py-1.5 text-sm font-medium ${
              activeTab === t.key ? "bg-voc-red text-white" : "bg-black/[.06] text-muted dark:bg-white/[.08]"
            }`}
          >
            {t.label}
          </Link>
        ))}
      </div>

      {activeTab === "overzicht" && <OverviewTab />}
      {activeTab === "community" && <CommunityTab />}
      {activeTab === "activiteiten" && <ActiviteitenTab />}
      {activeTab === "notificaties" && <NotificatiesTab />}
    </div>
  );
}
