"use client";

import { Suspense, startTransition, useOptimistic } from "react";
import { useSearchParams } from "next/navigation";
import { clsx } from "clsx";
import type { StatsPeriod } from "@/lib/statistics/period";
import { useStatsNav } from "./StatsNavContext";

export const STATS_TABS = [
  { key: "overzicht", label: "Overzicht" },
  { key: "leden", label: "Leden" },
  { key: "activiteiten", label: "Activiteiten" },
  { key: "community", label: "Community" },
  { key: "communicatie", label: "Communicatie" },
] as const;

export type StatsTabKey = (typeof STATS_TABS)[number]["key"];

export function tabPanelId(tab: StatsTabKey): string {
  return `stats-panel-${tab}`;
}

// Tekst-tabs met onderlijn i.p.v. de vorige gevulde Chip-pillen — horizontaal
// scrollbaar op mobiel (geen gestapelde/afgekapte rij). Periode/vergelijk
// blijven staan bij het wisselen van tabblad.
export function StatsTabs(props: { active: StatsTabKey }) {
  return (
    <Suspense fallback={<div className="h-11 w-64 animate-pulse rounded-lg bg-raised" />}>
      <StatsTabsInner {...props} />
    </Suspense>
  );
}

function StatsTabsInner({ active }: { active: StatsTabKey }) {
  const searchParams = useSearchParams();
  const { navigate } = useStatsNav();
  // Foutenrapport M9: het actieve streepje verspringde pas nadat de server
  // antwoordde — useOptimistic laat het tabblad zelf meteen (optimistisch)
  // actief lijken, net als PeriodMenu/isPending al voor de content doet.
  const [optimisticActive, setOptimisticActive] = useOptimistic(active);

  function hrefFor(tab: StatsTabKey): string {
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", tab);
    return `/beheer/statistieken?${params.toString()}`;
  }

  function selectTab(tab: StatsTabKey) {
    startTransition(() => {
      setOptimisticActive(tab);
      navigate(hrefFor(tab));
    });
  }

  // Foutenrapport M9: volledige tablist-toetsenbordpatroon — roving
  // tabindex (alleen de actieve tab is in de Tab-volgorde), pijl links/
  // rechts verplaatst de focus én activeert (dit zijn feitelijk URL's,
  // geen gescheiden paneel-inhoud die zonder navigatie kan wisselen), Home/
  // End naar de eerste/laatste.
  function handleKeyDown(e: React.KeyboardEvent, index: number) {
    if (e.key === "ArrowRight") {
      e.preventDefault();
      selectTab(STATS_TABS[(index + 1) % STATS_TABS.length].key);
    } else if (e.key === "ArrowLeft") {
      e.preventDefault();
      selectTab(STATS_TABS[(index - 1 + STATS_TABS.length) % STATS_TABS.length].key);
    } else if (e.key === "Home") {
      e.preventDefault();
      selectTab(STATS_TABS[0].key);
    } else if (e.key === "End") {
      e.preventDefault();
      selectTab(STATS_TABS[STATS_TABS.length - 1].key);
    }
  }

  return (
    <div
      role="tablist"
      className="flex gap-1 overflow-x-auto overflow-y-hidden [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
    >
      {STATS_TABS.map((tab, index) => {
        const isActive = optimisticActive === tab.key;
        return (
          <button
            key={tab.key}
            id={`stats-tab-${tab.key}`}
            type="button"
            onClick={() => selectTab(tab.key)}
            onKeyDown={(e) => handleKeyDown(e, index)}
            role="tab"
            aria-selected={isActive}
            aria-controls={tabPanelId(tab.key)}
            tabIndex={isActive ? 0 : -1}
            // Foutenrapport L11: min-h-11 (44px) i.p.v. de losse px-3 pb-3
            // pt-2 (~40px) voor een tikdoel dat de iOS/Material-richtlijn
            // haalt.
            className={clsx(
              "relative flex min-h-11 shrink-0 items-center whitespace-nowrap px-3 text-sm font-semibold transition-colors",
              isActive ? "text-foreground" : "text-muted hover:text-foreground"
            )}
          >
            {tab.label}
            {isActive && <span aria-hidden className="absolute inset-x-3 bottom-2 h-[3px] rounded-t-full bg-foreground" />}
          </button>
        );
      })}
    </div>
  );
}

// Foutenrapport M5: de kaartkop-links naar een ander tabblad ("Activiteiten",
// "Leden", "Communicatie" op Overzicht) gooiden de huidige periode/vergelijk
// weg en gebruikten een kale <Link> (dus zonder de dim-transitie van de rest
// van de pagina). Periode/vergelijk zijn in de aanroepende serverkaart al
// bekend (props), dus die kunnen we hier direct meegeven i.p.v. ze uit de
// URL te lezen.
export function StatsTabLink({
  tab,
  periode,
  compare,
  label,
}: {
  tab: StatsTabKey;
  periode: StatsPeriod;
  compare: boolean;
  label: string;
}) {
  const { navigate, isPending } = useStatsNav();
  const href = `/beheer/statistieken?tab=${tab}&periode=${periode}&vergelijk=${compare ? "1" : "0"}`;
  return (
    <button
      type="button"
      onClick={() => navigate(href)}
      disabled={isPending}
      className="text-xs font-semibold text-petrol hover:underline disabled:cursor-wait disabled:opacity-60"
    >
      {label}
    </button>
  );
}
