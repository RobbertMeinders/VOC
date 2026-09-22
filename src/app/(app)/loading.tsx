import { Skeleton } from "@/components/ui/Skeleton";

// Generieke fallback voor elke pagina zonder eigen, specifiekere
// loading.tsx (bv. Instellingen, Notificaties, Zoeken) — pagina's met een
// heel eigen vorm (ledenlijst, bedrijvenlijst, agenda, community,
// documenten) hebben hun eigen loading.tsx die dit overschrijft.
export default function AppLoading() {
  return (
    <div className="flex flex-col gap-4">
      <Skeleton className="h-6 w-48" />
      <Skeleton className="h-32 w-full" />
      <Skeleton className="h-32 w-full" />
    </div>
  );
}
