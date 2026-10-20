"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { clsx } from "clsx";
import { useStatsNav } from "./StatsNavContext";

export const STATS_TABS = [
  { key: "overzicht", label: "Overzicht" },
  { key: "leden", label: "Leden" },
  { key: "activiteiten", label: "Activiteiten" },
  { key: "community", label: "Community" },
  { key: "communicatie", label: "Communicatie" },
] as const;

export type StatsTabKey = (typeof STATS_TABS)[number]["key"];

// Tekst-tabs met onderlijn i.p.v. de vorige gevulde Chip-pillen — horizontaal
// scrollbaar op mobiel (geen gestapelde/afgekapte rij). Periode/vergelijk
// blijven staan bij het wisselen van tabblad.
export function StatsTabs(props: { active: StatsTabKey }) {
  return (
    <Suspense fallback={<div className="h-10 w-64 animate-pulse rounded-lg bg-raised" />}>
      <StatsTabsInner {...props} />
    </Suspense>
  );
}

function StatsTabsInner({ active }: { active: StatsTabKey }) {
  const searchParams = useSearchParams();
  const { navigate, isPending } = useStatsNav();

  function hrefFor(tab: StatsTabKey): string {
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", tab);
    return `/beheer/statistieken?${params.toString()}`;
  }

  return (
    <div
      role="tablist"
      className="flex gap-1 overflow-x-auto overflow-y-hidden [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
    >
      {STATS_TABS.map((tab) => (
        <button
          key={tab.key}
          type="button"
          onClick={() => navigate(hrefFor(tab.key))}
          role="tab"
          aria-selected={active === tab.key}
          disabled={isPending}
          className={clsx(
            "relative shrink-0 whitespace-nowrap px-3 pb-3 pt-2 text-sm font-semibold transition-colors disabled:cursor-wait",
            active === tab.key ? "text-foreground" : "text-muted hover:text-foreground"
          )}
        >
          {tab.label}
          {active === tab.key && <span aria-hidden className="absolute inset-x-3 bottom-0 h-[3px] rounded-t-full bg-foreground" />}
        </button>
      ))}
    </div>
  );
}
