import { Skeleton } from "@/components/ui/Skeleton";

// Vorm-eigen skelet voor het Beheer-dashboard i.p.v. de generieke fallback
// (src/app/(app)/loading.tsx) — BeheerSidebar zelf zit in beheer/layout.tsx
// en blijft dus al zichtbaar tijdens deze loading-state, dit dekt alleen de
// inhoud ernaast (StatTile-grid + een paar lijst-kaarten).
export default function BeheerLoading() {
  return (
    <div className="flex flex-col gap-6">
      {/* h-9: zelfde hoogte als de echte <h1> op deze pagina's. */}
      <Skeleton className="h-9 w-32" />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-24 rounded-2xl" />
        ))}
      </div>
      <div className="flex flex-col gap-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-20 rounded-2xl" />
        ))}
      </div>
    </div>
  );
}
