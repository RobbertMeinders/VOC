"use client";

import type { ReactNode } from "react";
import { clsx } from "clsx";
import { useStatsNav } from "./StatsNavContext";

// Dimt de (server-gerenderde) tabbladinhoud tijdens een tabblad-/periode-
// wissel i.p.v. 'm stil, zonder enige terugkoppeling, te laten hangen —
// zie StatsNavContext voor de volledige toelichting.
export function StatsContentArea({ children }: { children: ReactNode }) {
  const { isPending } = useStatsNav();
  return <div className={clsx("transition-opacity duration-150", isPending && "pointer-events-none opacity-40")}>{children}</div>;
}
