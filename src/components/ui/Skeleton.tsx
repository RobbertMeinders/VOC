import { clsx } from "clsx";

// Eén herbruikbaar pulserend blok — de bouwsteen voor elke loading.tsx-
// skeleton in de app, i.p.v. overal los dezelfde animate-pulse-div te
// schrijven.
export function Skeleton({ className }: { className?: string }) {
  return <div className={clsx("animate-pulse rounded-lg bg-black/[.06] dark:bg-white/[.08]", className)} />;
}
