"use client";

import type { ReactNode } from "react";
import { clsx } from "clsx";
import type { StatsTabKey } from "./StatsTabs";
import { tabPanelId } from "./StatsTabs";
import { useStatsNav } from "./StatsNavContext";

// Dimt de (server-gerenderde) tabbladinhoud tijdens een tabblad-/periode-
// wissel i.p.v. 'm stil, zonder enige terugkoppeling, te laten hangen —
// zie StatsNavContext voor de volledige toelichting.
//
// Foutenrapport M9: role="tabpanel"/aria-labelledby koppelt dit paneel aan
// zijn tab (StatsTabs zet aria-controls al naar hetzelfde id) — voorheen
// ontbrak die koppeling volledig. aria-busy i.p.v. de tabs zelf te
// disablen (dat kostte eerder de focus elke keer een wissel plaatsvond).
export function StatsContentArea({ active, children }: { active: StatsTabKey; children: ReactNode }) {
  const { isPending } = useStatsNav();
  return (
    <div
      role="tabpanel"
      id={tabPanelId(active)}
      aria-labelledby={`stats-tab-${active}`}
      aria-busy={isPending}
      className={clsx("transition-opacity duration-150", isPending && "opacity-40")}
    >
      {children}
    </div>
  );
}
