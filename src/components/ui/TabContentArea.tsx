"use client";

import type { ReactNode } from "react";
import { clsx } from "clsx";
import { useTabNav } from "@/lib/ui/TabNavContext";

// Generieke versie van StatsContentArea: dimt de (server-gerenderde)
// tabblad-inhoud tijdens een wissel i.p.v. 'm stil, zonder enige
// terugkoppeling, te laten hangen — zie TabNavContext voor de volledige
// toelichting.
export function TabContentArea({ children, className }: { children: ReactNode; className?: string }) {
  const { isPending } = useTabNav();
  return (
    <div aria-busy={isPending} className={clsx("transition-opacity duration-150", isPending && "opacity-40", className)}>
      {children}
    </div>
  );
}
