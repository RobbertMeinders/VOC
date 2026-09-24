import type { Metadata } from "next";
import type { ReactNode } from "react";
import Link from "next/link";
import { requireBoard } from "@/lib/auth/session";
import { BackLink } from "@/components/ui/BackLink";
import { LineTrend, BarTrend, Funnel } from "@/components/beheer/statistics/Charts";
import {
  getActivityStats,
  getCommunityStats,
  getEmailStats,
  getNotificationBreakdown,
  getOverviewStats,
  getPushStats,
  type NotificationBreakdownRow,
  type StatsPeriod,
} from "@/lib/statistics/queries";

export const metadata: Metadata = { title: "Statistieken" };

const TABS = [
  { key: "overzicht", label: "Overzicht" },
  { key: "community", label: "Community" },
  { key: "activiteiten", label: "Activiteiten" },
  { key: "email", label: "E-mail" },
  { key: "push", label: "Push" },
] as const;

const PERIOD_OPTIONS: { key: StatsPeriod; label: string }[] = [
  { key: "7d", label: "7 dagen" },
  { key: "30d", label: "30 dagen" },
  { key: "3m", label: "3 maanden" },
  { key: "12m", label: "12 maanden" },
  { key: "all", label: "Alles" },
];

const DEFAULT_PERIOD: StatsPeriod = "30d";

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

function periodLabel(period: StatsPeriod): string {
  return PERIOD_OPTIONS.find((p) => p.key === period)?.label ?? period;
}

function formatDate(iso: string): string {
  // nl-NL zet een punt achter verkorte maandnamen ("3 nov.") — de puur
  // numerieke stijl uit het voorbeeld ("3 nov") is compacter in een tabel.
  return new Date(iso).toLocaleDateString("nl-NL", { day: "numeric", month: "short" }).replace(".", "");
}

function formatPercentage(value: number): string {
  return `${value.toFixed(1).replace(".", ",")}%`;
}

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl border border-border bg-surface p-4 shadow-sm">
      <p className="text-2xl font-semibold text-foreground">{value}</p>
      <p className="text-xs text-muted">{label}</p>
    </div>
  );
}

function ChartCard({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="rounded-2xl border border-border bg-surface p-4 shadow-sm">
      <h2 className="mb-3 text-sm font-semibold text-foreground">{title}</h2>
      {children}
    </div>
  );
}

async function OverviewTab({ period }: { period: StatsPeriod }) {
  const stats = await getOverviewStats(period);
  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="Aantal leden" value={stats.totalMembers} />
        <StatCard label="Actieve leden" value={stats.activeMembers} />
        <StatCard label="Actieve pushabonnementen" value={stats.activePushSubscriptions} />
        <StatCard label="Leden met push" value={`${stats.pushPercentage}%`} />
        <StatCard label={`Nieuwe leden (${periodLabel(period)})`} value={stats.newMembers} />
        <StatCard label={`Nieuwe bedrijven (${periodLabel(period)})`} value={stats.newCompanies} />
        <StatCard label="Aankomende activiteiten" value={stats.upcomingActivities} />
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <ChartCard title="Ontwikkeling van het aantal leden">
          <LineTrend points={stats.memberGrowth} />
        </ChartCard>
        <ChartCard title="Nieuwe leden per maand">
          <BarTrend
            months={stats.newMembersPerMonth.map((p) => ({ month: p.month, label: p.label }))}
            series={[{ label: "Nieuwe leden", color: "var(--voc-red)", values: stats.newMembersPerMonth.map((p) => p.value) }]}
          />
        </ChartCard>
      </div>
    </div>
  );
}

async function CommunityTab({ period }: { period: StatsPeriod }) {
  const stats = await getCommunityStats(period);
  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="Aantal berichten" value={stats.totalPosts} />
        <StatCard label="Unieke leden die bekeken" value={stats.uniqueViewers} />
        <StatCard label="Likes" value={stats.totalLikes} />
        <StatCard label="Reacties" value={stats.totalComments} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <ChartCard title="Berichten en reacties per maand">
          <BarTrend
            months={stats.postsAndCommentsPerMonth.map((p) => ({ month: p.month, label: p.label }))}
            series={[
              { label: "Berichten", color: "var(--voc-red)", values: stats.postsAndCommentsPerMonth.map((p) => p.posts) },
              { label: "Reacties", color: "var(--chart-secondary)", values: stats.postsAndCommentsPerMonth.map((p) => p.comments) },
            ]}
          />
        </ChartCard>
        <ChartCard title="Ontwikkeling van unieke views per maand">
          <LineTrend points={stats.viewsPerMonth} />
        </ChartCard>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-border bg-surface shadow-sm">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-border text-xs text-muted">
              <th className="px-4 py-2 font-medium">Bericht</th>
              <th className="px-4 py-2 text-center font-medium">Unieke views</th>
              <th className="px-4 py-2 text-center font-medium">Totale views</th>
              <th className="px-4 py-2 text-center font-medium">Likes</th>
              <th className="px-4 py-2 text-center font-medium">Reacties</th>
            </tr>
          </thead>
          <tbody>
            {stats.posts.map((post) => (
              <tr key={post.id} className="border-b border-border last:border-0">
                <td className="max-w-md truncate px-4 py-2 text-foreground">{post.excerpt}</td>
                <td className="px-4 py-2 text-center text-muted">{post.uniqueViews}</td>
                <td className="px-4 py-2 text-center text-muted">{post.totalViews}</td>
                <td className="px-4 py-2 text-center text-muted">{post.likes}</td>
                <td className="px-4 py-2 text-center text-muted">{post.comments}</td>
              </tr>
            ))}
            {stats.posts.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-sm text-muted">
                  Nog geen berichten geplaatst.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

async function ActiviteitenTab({ period }: { period: StatsPeriod }) {
  const stats = await getActivityStats(period);
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

      <div className="grid gap-4 lg:grid-cols-2">
        <ChartCard title="Bekeken → aangemeld → aanwezig">
          <Funnel
            steps={[
              { label: "Bekeken", value: stats.uniqueViewers },
              { label: "Aangemeld", value: stats.totalRegistrations },
              { label: "Aanwezig", value: stats.totalAttendees },
            ]}
          />
        </ChartCard>
        <ChartCard title="Aanmeldingen en aanwezigheid per maand">
          <BarTrend
            months={stats.registrationsAndAttendancePerMonth.map((p) => ({ month: p.month, label: p.label }))}
            series={[
              {
                label: "Aangemeld",
                color: "var(--voc-red)",
                values: stats.registrationsAndAttendancePerMonth.map((p) => p.registrations),
              },
              {
                label: "Aanwezig",
                color: "var(--chart-secondary)",
                values: stats.registrationsAndAttendancePerMonth.map((p) => p.attendees),
              },
            ]}
          />
        </ChartCard>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-border bg-surface shadow-sm">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-border text-xs text-muted">
              <th className="px-4 py-2 font-medium">Activiteit</th>
              <th className="px-4 py-2 text-center font-medium">Unieke views</th>
              <th className="px-4 py-2 text-center font-medium">Aangemeld</th>
              <th className="px-4 py-2 text-center font-medium">Aanwezig</th>
            </tr>
          </thead>
          <tbody>
            {stats.activities.map((activity) => (
              <tr key={activity.id} className="border-b border-border last:border-0">
                <td className="max-w-xs truncate px-4 py-2 text-foreground">{activity.title}</td>
                <td className="px-4 py-2 text-center text-muted">{activity.uniqueViews}</td>
                <td className="px-4 py-2 text-center text-muted">{activity.registrations}</td>
                <td className="px-4 py-2 text-center text-muted">{activity.attendees}</td>
              </tr>
            ))}
            {stats.activities.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-center text-sm text-muted">
                  Nog geen activiteiten.
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
// kolommen voor het relevante kanaal, en alleen rijen die op dat kanaal ook
// echt iets verstuurd hebben. Kanaal staat er als vaste kolomwaarde bij
// (i.p.v. de twee kanalen in één tabel te mengen) omdat de tabbladen zelf al
// per kanaal gesplitst zijn.
function ChannelBreakdownTable({
  rows,
  channel,
  getSent,
  getOpened,
}: {
  rows: NotificationBreakdownRow[];
  channel: "E-mail" | "Push";
  getSent: (row: NotificationBreakdownRow) => number;
  getOpened: (row: NotificationBreakdownRow) => number;
}) {
  const filtered = rows.filter((row) => getSent(row) > 0);
  return (
    <div className="overflow-x-auto rounded-2xl border border-border bg-surface shadow-sm">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-border text-xs text-muted">
            <th className="px-4 py-2 font-medium">Melding</th>
            <th className="px-4 py-2 font-medium">Type</th>
            <th className="px-4 py-2 font-medium">Kanaal</th>
            <th className="px-4 py-2 text-center font-medium">Verzonden</th>
            <th className="px-4 py-2 text-center font-medium">Geopend</th>
            <th className="px-4 py-2 text-center font-medium">%</th>
            <th className="px-4 py-2 font-medium">Verzonden op</th>
          </tr>
        </thead>
        <tbody>
          {filtered.map((row) => {
            const sent = getSent(row);
            const opened = getOpened(row);
            return (
              <tr key={row.key} className="border-b border-border last:border-0">
                <td className="max-w-[220px] truncate px-4 py-2 text-foreground">{row.title}</td>
                <td className="px-4 py-2 text-muted">{NOTIFICATION_TYPE_LABELS[row.type] ?? row.type}</td>
                <td className="px-4 py-2 text-muted">{channel}</td>
                <td className="px-4 py-2 text-center text-muted">{sent}</td>
                <td className="px-4 py-2 text-center text-muted">{opened}</td>
                <td className="px-4 py-2 text-center text-muted">{sent > 0 ? formatPercentage((opened / sent) * 100) : "—"}</td>
                <td className="px-4 py-2 text-muted">{formatDate(row.firstSentAt)}</td>
              </tr>
            );
          })}
          {filtered.length === 0 && (
            <tr>
              <td colSpan={7} className="px-4 py-6 text-center text-sm text-muted">
                Nog niks verstuurd.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

async function EmailTab({ period }: { period: StatsPeriod }) {
  const [stats, breakdown] = await Promise.all([getEmailStats(period), getNotificationBreakdown()]);
  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label={`Verzonden e-mails (${periodLabel(period)})`} value={stats.emailsSent} />
        <StatCard label={`Geopende e-mails (${periodLabel(period)})`} value={stats.emailsOpened} />
        <StatCard label="Open rate" value={stats.openRatePercentage === null ? "—" : `${stats.openRatePercentage}%`} />
      </div>
      <ChartCard title="Openingspercentage per maand">
        <LineTrend points={stats.openRatePerMonth} suffix="%" />
      </ChartCard>
      <ChannelBreakdownTable rows={breakdown} channel="E-mail" getSent={(row) => row.sentEmail} getOpened={(row) => row.openedEmail} />
    </div>
  );
}

async function PushTab({ period }: { period: StatsPeriod }) {
  const [stats, breakdown] = await Promise.all([getPushStats(period), getNotificationBreakdown()]);
  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="Actieve pushabonnementen" value={stats.activePushSubscriptions} />
        <StatCard label="Leden met push" value={`${stats.pushPercentage}%`} />
        <StatCard label={`Nieuwe abonnementen (${periodLabel(period)})`} value={stats.newPushSubscriptions} />
        <StatCard label={`Opgezegde abonnementen (${periodLabel(period)})`} value={stats.unsubscribedPushSubscriptions} />
        <StatCard label={`Verzonden pushmeldingen (${periodLabel(period)})`} value={stats.pushesSent} />
        <StatCard label={`Geopende pushmeldingen (${periodLabel(period)})`} value={stats.pushesOpened} />
      </div>
      <ChartCard title="Openingspercentage per maand">
        <LineTrend points={stats.openRatePerMonth} suffix="%" />
      </ChartCard>
      <ChannelBreakdownTable rows={breakdown} channel="Push" getSent={(row) => row.sentPush} getOpened={(row) => row.openedPush} />
    </div>
  );
}

export default async function StatistiekenPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; period?: string }>;
}) {
  await requireBoard();
  const { tab, period: periodParam } = await searchParams;
  const activeTab: TabKey = TABS.some((t) => t.key === tab) ? (tab as TabKey) : "overzicht";
  const period: StatsPeriod = PERIOD_OPTIONS.some((p) => p.key === periodParam) ? (periodParam as StatsPeriod) : DEFAULT_PERIOD;

  return (
    <div className="flex flex-col gap-4">
      <BackLink href="/beheer" label="Terug naar Beheer" />
      <div>
        <h1 className="text-xl font-semibold text-foreground">Statistieken</h1>
        <p className="text-sm text-muted">Belangrijkste cijfers over leden, community, activiteiten, e-mail en push.</p>
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex gap-1.5 overflow-x-auto">
          {TABS.map((t) => (
            <Link
              key={t.key}
              href={`/beheer/statistieken?tab=${t.key}&period=${period}`}
              className={`shrink-0 rounded-full px-3 py-1.5 text-sm font-medium ${
                activeTab === t.key ? "bg-voc-red text-white" : "bg-black/[.06] text-muted dark:bg-white/[.08]"
              }`}
            >
              {t.label}
            </Link>
          ))}
        </div>
        <div className="flex items-center gap-1.5 overflow-x-auto">
          <span className="shrink-0 text-xs text-muted">Periode</span>
          {PERIOD_OPTIONS.map((p) => (
            <Link
              key={p.key}
              href={`/beheer/statistieken?tab=${activeTab}&period=${p.key}`}
              className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${
                period === p.key ? "bg-foreground text-background" : "bg-black/[.04] text-muted dark:bg-white/[.06]"
              }`}
            >
              {p.label}
            </Link>
          ))}
        </div>
      </div>

      {activeTab === "overzicht" && <OverviewTab period={period} />}
      {activeTab === "community" && <CommunityTab period={period} />}
      {activeTab === "activiteiten" && <ActiviteitenTab period={period} />}
      {activeTab === "email" && <EmailTab period={period} />}
      {activeTab === "push" && <PushTab period={period} />}
    </div>
  );
}
