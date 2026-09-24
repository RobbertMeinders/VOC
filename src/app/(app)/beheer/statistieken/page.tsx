import type { Metadata } from "next";
import Link from "next/link";
import { requireBoard } from "@/lib/auth/session";
import { BackLink } from "@/components/ui/BackLink";
import {
  getActivityStats,
  getCommunityStats,
  getEmailStats,
  getNotificationBreakdown,
  getOverviewStats,
  getPushStats,
  type NotificationBreakdownRow,
} from "@/lib/statistics/queries";

export const metadata: Metadata = { title: "Statistieken" };

const TABS = [
  { key: "overzicht", label: "Overzicht" },
  { key: "community", label: "Community" },
  { key: "activiteiten", label: "Activiteiten" },
  { key: "email", label: "E-mail" },
  { key: "push", label: "Push" },
] as const;

// Voor leesbare labels in de per-melding-tabel — mirror van de types die de
// trigger-functies in notifications.type zetten (zie bv. 0019/0023/0034).
const NOTIFICATION_TYPE_LABELS: Record<string, string> = {
  new_activity: "Nieuwe activiteit",
  activity_reminder: "Activiteitherinnering",
  waitlist_promoted: "Van wachtlijst geplaatst",
  feed_comment: "Reactie",
  feed_mention: "Vermelding",
  new_member: "Nieuw lid",
  company_membership_request: "Bedrijfskoppeling ter goedkeuring",
  company_membership_decision: "Bedrijfskoppeling-besluit",
  access_request: "Toegangsaanvraag",
  activity_submission: "Activiteit ter goedkeuring",
  activity_decision: "Activiteit-besluit",
  feed_post_report: "Bericht gerapporteerd",
  manual_broadcast: "Handmatig pushbericht",
};

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
      <div className="overflow-x-auto rounded-2xl border border-border bg-surface shadow-sm">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-border text-xs text-muted">
              <th className="px-4 py-2 font-medium">Meest bekeken berichten</th>
              <th className="px-4 py-2 text-center font-medium">Bekeken</th>
            </tr>
          </thead>
          <tbody>
            {stats.topPosts.map((post) => (
              <tr key={post.id} className="border-b border-border last:border-0">
                <td className="max-w-md truncate px-4 py-2 text-foreground">{post.excerpt}</td>
                <td className="px-4 py-2 text-center text-muted">{post.views}</td>
              </tr>
            ))}
            {stats.topPosts.length === 0 && (
              <tr>
                <td colSpan={2} className="px-4 py-6 text-center text-sm text-muted">
                  Nog geen bekeken berichten via een genoemde link.
                </td>
              </tr>
            )}
          </tbody>
        </table>
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
      <div className="overflow-x-auto rounded-2xl border border-border bg-surface shadow-sm">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-border text-xs text-muted">
              <th className="px-4 py-2 font-medium">Meest bekeken activiteiten</th>
              <th className="px-4 py-2 text-center font-medium">Bekeken</th>
              <th className="px-4 py-2 text-center font-medium">Aangemeld</th>
              <th className="px-4 py-2 text-center font-medium">Aanwezig</th>
            </tr>
          </thead>
          <tbody>
            {stats.topActivities.map((activity) => (
              <tr key={activity.id} className="border-b border-border last:border-0">
                <td className="max-w-xs truncate px-4 py-2 text-foreground">{activity.title}</td>
                <td className="px-4 py-2 text-center text-muted">{activity.views}</td>
                <td className="px-4 py-2 text-center text-muted">{activity.registrations}</td>
                <td className="px-4 py-2 text-center text-muted">{activity.attendees}</td>
              </tr>
            ))}
            {stats.topActivities.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-center text-sm text-muted">
                  Nog geen bekeken activiteiten.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// Gedeeld door EmailTab en PushTab — dezelfde per-melding-tabel, alleen de
// kolommen voor het relevante kanaal, en alleen rijen die op dat kanaal
// ook echt iets verstuurd hebben.
function BreakdownTable({
  rows,
  sentLabel,
  openedLabel,
  getSent,
  getOpened,
}: {
  rows: NotificationBreakdownRow[];
  sentLabel: string;
  openedLabel: string;
  getSent: (row: NotificationBreakdownRow) => number;
  getOpened: (row: NotificationBreakdownRow) => number;
}) {
  const filtered = rows.filter((row) => getSent(row) > 0);
  return (
    <div className="overflow-x-auto rounded-2xl border border-border bg-surface shadow-sm">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-border text-xs text-muted">
            <th className="px-4 py-2 font-medium">Per melding (laatste 30 dagen)</th>
            <th className="px-4 py-2 text-center font-medium">{sentLabel}</th>
            <th className="px-4 py-2 text-center font-medium">{openedLabel}</th>
          </tr>
        </thead>
        <tbody>
          {filtered.map((row) => (
            <tr key={row.key} className="border-b border-border last:border-0">
              <td className="max-w-xs px-4 py-2">
                <p className="truncate text-foreground">{row.title}</p>
                <p className="text-xs text-muted">{NOTIFICATION_TYPE_LABELS[row.type] ?? row.type}</p>
              </td>
              <td className="px-4 py-2 text-center text-muted">{getSent(row)}</td>
              <td className="px-4 py-2 text-center text-muted">{getOpened(row) || "—"}</td>
            </tr>
          ))}
          {filtered.length === 0 && (
            <tr>
              <td colSpan={3} className="px-4 py-6 text-center text-sm text-muted">
                Nog niks verstuurd in de laatste 30 dagen.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

async function EmailTab() {
  const [stats, breakdown] = await Promise.all([getEmailStats(), getNotificationBreakdown()]);
  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="Verzonden e-mails (30d)" value={stats.emailsSent} />
        <StatCard label="Geopende e-mails (30d)" value={stats.emailsOpened} />
        <StatCard label="Open rate" value={stats.openRatePercentage === null ? "—" : `${stats.openRatePercentage}%`} />
      </div>
      <BreakdownTable
        rows={breakdown}
        sentLabel="Verzonden"
        openedLabel="Geopend"
        getSent={(row) => row.sentEmail}
        getOpened={(row) => row.openedEmail}
      />
    </div>
  );
}

async function PushTab() {
  const [stats, breakdown] = await Promise.all([getPushStats(), getNotificationBreakdown()]);
  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="Actieve pushabonnementen" value={stats.activePushSubscriptions} />
        <StatCard label="Leden met push" value={`${stats.pushPercentage}%`} />
        <StatCard label="Nieuwe abonnementen (30d)" value={stats.newPushSubscriptions} />
        <StatCard label="Opgezegde abonnementen (30d)" value={stats.unsubscribedPushSubscriptions} />
        <StatCard label="Verzonden pushmeldingen (30d)" value={stats.pushesSent} />
        <StatCard label="Geopende pushmeldingen (30d)" value={stats.pushesOpened} />
      </div>
      <BreakdownTable
        rows={breakdown}
        sentLabel="Verzonden"
        openedLabel="Geopend"
        getSent={(row) => row.sentPush}
        getOpened={(row) => row.openedPush}
      />
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
        <p className="text-sm text-muted">Belangrijkste cijfers over leden, community, activiteiten, e-mail en push.</p>
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
      {activeTab === "email" && <EmailTab />}
      {activeTab === "push" && <PushTab />}
    </div>
  );
}
