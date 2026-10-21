import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { Mail, MessagesSquare, Megaphone } from "lucide-react";
import { requireBoard } from "@/lib/auth/session";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatsTabs, type StatsTabKey } from "@/components/beheer/statistics/StatsTabs";
import { PeriodMenu } from "@/components/beheer/statistics/PeriodMenu";
import { StatsNavProvider } from "@/components/beheer/statistics/StatsNavContext";
import { StatsContentArea } from "@/components/beheer/statistics/StatsContentArea";
import { KpiTile } from "@/components/beheer/statistics/KpiTile";
import { LineChart, BarChart, HorizontalBars, FunnelChart, Legend, type BarRow } from "@/components/beheer/statistics/Charts";
import { SignalsList, IconStatList } from "@/components/beheer/statistics/Lists";
import { resolvePeriod, resolvePeriodRange, periodLabel, prevPeriodLabel, formatRangeLabel } from "@/lib/statistics/period";
import { getOverviewStats } from "@/lib/statistics/overview";
import { getMembersStats } from "@/lib/statistics/members";
import { getActivitiesStats } from "@/lib/statistics/activities";
import { getCommunityStats } from "@/lib/statistics/community";
import { getCommunicationStats } from "@/lib/statistics/communication";

export const metadata: Metadata = { title: "Statistieken" };

function ChartCard({
  title,
  subtitle,
  action,
  children,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="flex min-w-0 flex-col gap-3 rounded-2xl bg-surface p-4 shadow-sm">
      <div className="flex items-baseline justify-between gap-3">
        <h3 className="text-[16.5px] font-bold text-foreground">{title}</h3>
        {action ?? (subtitle && <span className="shrink-0 text-xs font-medium text-muted">{subtitle}</span>)}
      </div>
      {children}
    </div>
  );
}

function KpiGrid({ children }: { children: ReactNode }) {
  return <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">{children}</div>;
}

const CHART_COLORS = { primary: "var(--chart-primary)", secondary: "var(--chart-secondary)", compare: "var(--chart-compare)" };

async function OverviewTab({ period, compare }: { period: ReturnType<typeof resolvePeriodRange>; compare: boolean }) {
  const stats = await getOverviewStats(period);
  const compareLabel = prevPeriodLabel(period.period);
  const trendLabels = stats.activeMembersTrend.map((p) => p.label);

  return (
    <div className="flex flex-col gap-4">
      <KpiGrid>
        {Object.values(stats.kpis).map((kpi) => (
          <KpiTile key={kpi.label} kpi={kpi} compareLabel={compareLabel} compare={compare} />
        ))}
      </KpiGrid>

      <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        <ChartCard
          title="Actieve leden"
          subtitle={`ingelogd per ${period.granularity === "month" ? "maand" : period.granularity === "week" ? "week" : "dag"}`}
        >
          <LineChart
            labels={trendLabels}
            series={[
              { name: "Deze periode", color: CHART_COLORS.primary, values: stats.activeMembersTrend.map((p) => p.value) },
              ...(compare
                ? [{ name: compareLabel, color: CHART_COLORS.compare, dashed: true, values: stats.activeMembersTrendPrev.map((p) => p.value) }]
                : []),
            ]}
          />
          {compare && (
            <Legend
              items={[
                { label: "Deze periode", color: CHART_COLORS.primary },
                { label: compareLabel.charAt(0).toUpperCase() + compareLabel.slice(1), color: CHART_COLORS.compare, dashed: true },
              ]}
            />
          )}
        </ChartCard>

        <ChartCard title="Instroom" subtitle={periodLabel(period.period).toLowerCase()}>
          <FunnelChart steps={stats.instroom} />
          <p className="rounded-lg bg-raised px-3 py-2 text-xs text-muted">
            Gasten die zich via de website aanmelden voor een open activiteit worden prospect. Zo zie je of activiteiten nieuwe leden
            opleveren.
          </p>
        </ChartCard>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        <ChartCard title="Activiteiten in deze periode" action={<Link href="/beheer/statistieken?tab=activiteiten" className="text-xs font-semibold text-petrol hover:underline">Activiteiten</Link>}>
          <HorizontalBars
            rows={stats.activiteiten.map((a) => ({
              id: a.id,
              label: a.title,
              href: a.href,
              value: a.value,
              secondary: a.waitlist,
              max: a.max ?? undefined,
              valueLabel: a.subtitle,
            }))}
          />
          <p className="text-xs text-muted">Balk = bezetting: aanmeldingen ten opzichte van het maximum.</p>
        </ChartCard>

        <ChartCard title="Signalen" subtitle="vragen om actie">
          <SignalsList items={stats.signalen} />
        </ChartCard>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <ChartCard title="Ledenontwikkeling" action={<Link href="/beheer/statistieken?tab=leden" className="text-xs font-semibold text-petrol hover:underline">Leden</Link>}>
          <BarChart
            labels={stats.ledenontwikkeling.map((p) => p.label)}
            series={[
              { name: "Nieuw", color: CHART_COLORS.primary, values: stats.ledenontwikkeling.map((p) => p.nieuw) },
              { name: "Uitgeschreven", color: CHART_COLORS.secondary, values: stats.ledenontwikkeling.map((p) => p.uitgeschreven) },
            ]}
          />
          <Legend items={[{ label: "Nieuw", color: CHART_COLORS.primary }, { label: "Uitgeschreven", color: CHART_COLORS.secondary }]} />
        </ChartCard>

        <ChartCard title="Bereik" action={<Link href="/beheer/statistieken?tab=communicatie" className="text-xs font-semibold text-petrol hover:underline">Communicatie</Link>}>
          <IconStatList
            items={[
              {
                icon: (
                  <>
                    <Mail size={10} className="mx-auto mb-0.5 text-muted" />
                    <span className="font-display text-[15px] font-extrabold text-foreground">
                      {stats.bereik.laatsteNieuwsbrief?.afgeleverd ?? "–"}
                    </span>
                  </>
                ),
                title: "Laatste nieuwsbrief afgeleverd",
                subtitle: stats.bereik.laatsteNieuwsbrief
                  ? `van ${stats.bereik.laatsteNieuwsbrief.ontvangers} · ${stats.bereik.laatsteNieuwsbrief.mislukt} mislukt`
                  : "Nog geen nieuwsbrief verstuurd",
              },
              {
                icon: (
                  <>
                    <Megaphone size={10} className="mx-auto mb-0.5 text-muted" />
                    <span className="font-display text-[15px] font-extrabold text-foreground">{stats.bereik.pushPercentage}%</span>
                  </>
                ),
                title: "Leden met pushmeldingen aan",
                subtitle: `${stats.bereik.pushCount} van de ${stats.bereik.activeMemberCount} leden`,
              },
              {
                icon: (
                  <>
                    <MessagesSquare size={10} className="mx-auto mb-0.5 text-muted" />
                    <span className="font-display text-[15px] font-extrabold text-foreground">{stats.bereik.communityPosts}</span>
                  </>
                ),
                title: "Berichten in de community",
                subtitle: stats.bereik.meestGelezenTitel
                  ? `${stats.bereik.communityComments} reacties · meest gelezen: "${stats.bereik.meestGelezenTitel}"`
                  : `${stats.bereik.communityComments} reacties`,
              },
            ]}
          />
        </ChartCard>
      </div>
    </div>
  );
}

async function LedenTab({ period, compare }: { period: ReturnType<typeof resolvePeriodRange>; compare: boolean }) {
  const stats = await getMembersStats(period);
  const compareLabel = prevPeriodLabel(period.period);

  return (
    <div className="flex flex-col gap-4">
      <KpiGrid>
        {Object.values(stats.kpis).map((kpi) => (
          <KpiTile key={kpi.label} kpi={kpi} compareLabel={compareLabel} compare={compare} />
        ))}
      </KpiGrid>

      <div className="grid gap-4 lg:grid-cols-2">
        <ChartCard title="Nieuw en uitgeschreven per maand" subtitle="laatste 12 maanden">
          <BarChart
            labels={stats.nieuwUitgeschrevenPerMaand.map((p) => p.label)}
            series={[
              { name: "Nieuw", color: CHART_COLORS.primary, values: stats.nieuwUitgeschrevenPerMaand.map((p) => p.nieuw) },
              { name: "Uitgeschreven", color: CHART_COLORS.secondary, values: stats.nieuwUitgeschrevenPerMaand.map((p) => p.uitgeschreven) },
            ]}
          />
          <Legend items={[{ label: "Nieuw", color: CHART_COLORS.primary }, { label: "Uitgeschreven", color: CHART_COLORS.secondary }]} />
        </ChartCard>

        <ChartCard title="Activatie" subtitle="van alle leden">
          <FunnelChart steps={stats.activatie} />
        </ChartCard>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <ChartCard title="Leden per branche" subtitle="via het bedrijf">
          <HorizontalBars rows={toBarRows(stats.perBranche)} />
        </ChartCard>
        <ChartCard title="Leden per plaats">
          <HorizontalBars rows={toBarRows(stats.perPlaats)} />
        </ChartCard>
      </div>
    </div>
  );
}

async function ActiviteitenTab({ period, compare }: { period: ReturnType<typeof resolvePeriodRange>; compare: boolean }) {
  const stats = await getActivitiesStats(period);
  const compareLabel = prevPeriodLabel(period.period);

  return (
    <div className="flex flex-col gap-4">
      <KpiGrid>
        {Object.values(stats.kpis).map((kpi) => (
          <KpiTile key={kpi.label} kpi={kpi} compareLabel={compareLabel} compare={compare} />
        ))}
      </KpiGrid>

      <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        <ChartCard title="Bezetting per activiteit" subtitle={periodLabel(period.period).toLowerCase()}>
          <HorizontalBars
            rows={stats.bezetting.map((a) => ({
              id: a.id,
              label: a.title,
              href: a.href,
              value: a.value,
              secondary: a.waitlist,
              max: a.max ?? undefined,
              valueLabel: a.subtitle,
            }))}
          />
          <p className="text-xs text-muted">Balk = bezetting: aanmeldingen ten opzichte van het maximum.</p>
        </ChartCard>

        <ChartCard title="Wie komt er?">
          <HorizontalBars rows={toBarRows(stats.wieKomtEr)} />
          <p className="rounded-lg bg-raised px-3 py-2 text-xs text-muted">
            Van alle actieve leden. De groep &quot;nog nooit&quot; is een goede doelgroep voor een persoonlijke uitnodiging.
          </p>
        </ChartCard>
      </div>

      <ChartCard title="Aanmeldingen per maand" subtitle="leden en gasten via de website">
        <BarChart
          labels={stats.aanmeldingenPerMaand.map((p) => p.label)}
          series={[
            { name: "Leden", color: CHART_COLORS.primary, values: stats.aanmeldingenPerMaand.map((p) => p.leden) },
            { name: "Gasten via website", color: CHART_COLORS.secondary, values: stats.aanmeldingenPerMaand.map((p) => p.gasten) },
          ]}
        />
        <Legend items={[{ label: "Leden", color: CHART_COLORS.primary }, { label: "Gasten via website", color: CHART_COLORS.secondary }]} />
        <p className="text-xs text-muted">
          Opkomst (wie er echt was) staat in de aanwezigheidslijst per activiteit, niet hierin - dit zijn aanmeldingen.
        </p>
      </ChartCard>
    </div>
  );
}

async function CommunityTab({ period, compare }: { period: ReturnType<typeof resolvePeriodRange>; compare: boolean }) {
  const stats = await getCommunityStats(period);
  const compareLabel = prevPeriodLabel(period.period);
  const granularity = period.granularity === "month" ? "maand" : period.granularity === "week" ? "week" : "dag";

  return (
    <div className="flex flex-col gap-4">
      <KpiGrid>
        {Object.values(stats.kpis).map((kpi) => (
          <KpiTile key={kpi.label} kpi={kpi} compareLabel={compareLabel} compare={compare} />
        ))}
      </KpiGrid>

      <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        <ChartCard title="Berichten en reacties" subtitle={`per ${granularity}`}>
          <LineChart
            labels={stats.trend.map((p) => p.label)}
            series={[
              { name: "Reacties", color: CHART_COLORS.primary, values: stats.trend.map((p) => p.value) },
              { name: "Berichten", color: CHART_COLORS.secondary, values: stats.trendBerichten.map((p) => p.value) },
            ]}
          />
          <Legend items={[{ label: "Reacties", color: CHART_COLORS.primary }, { label: "Berichten", color: CHART_COLORS.secondary }]} />
        </ChartCard>

        <ChartCard title="Soort bericht">
          <HorizontalBars rows={toBarRows(stats.perSoort)} />
          {stats.meestGelezen.length > 0 && (
            <>
              <h4 className="mt-1.5 text-sm font-bold text-foreground">Meest gelezen</h4>
              <div className="flex flex-col divide-y divide-border">
                {stats.meestGelezen.map((p) => (
                  <div key={p.title} className="py-2 text-sm">
                    <p className="truncate font-medium text-foreground">{p.title}</p>
                    <p className="text-xs text-muted">
                      {p.author} · {p.views} keer gelezen{p.comments > 0 ? ` · ${p.comments} reacties` : ""}
                    </p>
                  </div>
                ))}
              </div>
            </>
          )}
        </ChartCard>
      </div>
    </div>
  );
}

async function CommunicatieTab({ period, compare }: { period: ReturnType<typeof resolvePeriodRange>; compare: boolean }) {
  const stats = await getCommunicationStats(period);
  const compareLabel = prevPeriodLabel(period.period);
  const nl = new Intl.NumberFormat("nl-NL");
  const formatDate = (iso: string) => new Date(iso).toLocaleDateString("nl-NL", { day: "numeric", month: "short" }).replace(".", "");

  return (
    <div className="flex flex-col gap-4">
      <KpiGrid>
        {Object.values(stats.kpis).map((kpi) => (
          <KpiTile key={kpi.label} kpi={kpi} compareLabel={compareLabel} compare={compare} />
        ))}
      </KpiGrid>

      <ChartCard title="Nieuwsbrieven" action={<Link href="/beheer/communicatie" className="text-xs font-semibold text-petrol hover:underline">Alle nieuwsbrieven</Link>}>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-border text-xs text-muted">
                <th className="px-3 py-2 font-medium">Nieuwsbrief</th>
                <th className="px-3 py-2 font-medium">Verstuurd</th>
                <th className="px-3 py-2 text-right font-medium">Ontvangers</th>
                <th className="px-3 py-2 text-right font-medium">Afgeleverd</th>
                <th className="px-3 py-2 text-right font-medium">Mislukt</th>
              </tr>
            </thead>
            <tbody>
              {stats.newsletters.map((n) => (
                <tr key={n.id} className="border-b border-border last:border-0">
                  <td className="max-w-[220px] truncate px-3 py-2 font-medium text-foreground">{n.subject}</td>
                  <td className="px-3 py-2 text-muted">{n.sentAt ? formatDate(n.sentAt) : "-"}</td>
                  <td className="px-3 py-2 text-right tabular-nums text-muted">{nl.format(n.ontvangers)}</td>
                  <td className="px-3 py-2 text-right tabular-nums text-muted">{nl.format(n.afgeleverd)}</td>
                  <td className="px-3 py-2 text-right tabular-nums text-muted">{nl.format(n.mislukt)}</td>
                </tr>
              ))}
              {stats.newsletters.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-3 py-6 text-center text-sm text-muted">
                    Nog geen nieuwsbrieven verstuurd.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <p className="rounded-lg bg-raised px-3 py-2 text-xs text-muted">
          Openen en klikken meten we hier bewust niet: dat is onbetrouwbaar door privacybescherming in Apple Mail en Gmail, en er is geen
          koppeling tussen een afmelding en de nieuwsbrief die daarvoor zorgde.
        </p>
      </ChartCard>

      <div className="grid gap-4 lg:grid-cols-2">
        <ChartCard title="Meldingen in het portaal" subtitle={periodLabel(period.period).toLowerCase()}>
          <HorizontalBars rows={toBarRows(stats.meldingenPerType)} />
        </ChartCard>
        <ChartCard title="Hoe komen meldingen aan?">
          <HorizontalBars
            rows={stats.kanalen.map((k, i) => ({ id: String(i), label: k.label, value: k.value, max: 100, valueLabel: `${k.value}%` }))}
          />
          <p className="text-xs text-muted">Percentage actieve leden dat het kanaal aan heeft staan.</p>
        </ChartCard>
      </div>
    </div>
  );
}

function toBarRows(items: { label: string; value: number }[]): BarRow[] {
  const nl = new Intl.NumberFormat("nl-NL");
  return items.map((item, i) => ({ id: `${item.label}-${i}`, label: item.label, value: item.value, valueLabel: nl.format(item.value) }));
}

export default async function StatistiekenPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; periode?: string; vergelijk?: string }>;
}) {
  await requireBoard();
  const { tab, periode, vergelijk } = await searchParams;
  const activeTab: StatsTabKey = (["overzicht", "leden", "activiteiten", "community", "communicatie"] as const).includes(
    tab as StatsTabKey
  )
    ? (tab as StatsTabKey)
    : "overzicht";
  const period = resolvePeriod(periode);
  const compare = vergelijk !== "0";
  const range = resolvePeriodRange(period);

  return (
    <StatsNavProvider>
      <div className="flex flex-col gap-4">
        <PageHeader title="Statistieken" description="Hoe gaat het met de vereniging en het portaal." />

        <div className="flex items-end justify-between gap-3 border-b border-border">
          <StatsTabs active={activeTab} />
          <div className="pb-2">
            <PeriodMenu period={period} compare={compare} />
          </div>
        </div>
        <p className="-mt-2 text-xs text-muted">
          {formatRangeLabel(range)}
          {compare ? ` · vergeleken met ${prevPeriodLabel(period)}` : ""}
        </p>

        <StatsContentArea>
          {activeTab === "overzicht" && <OverviewTab period={range} compare={compare} />}
          {activeTab === "leden" && <LedenTab period={range} compare={compare} />}
          {activeTab === "activiteiten" && <ActiviteitenTab period={range} compare={compare} />}
          {activeTab === "community" && <CommunityTab period={range} compare={compare} />}
          {activeTab === "communicatie" && <CommunicatieTab period={range} compare={compare} />}
        </StatsContentArea>
      </div>
    </StatsNavProvider>
  );
}
