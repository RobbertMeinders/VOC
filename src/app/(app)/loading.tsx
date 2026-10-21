import { Skeleton } from "@/components/ui/Skeleton";

// Generieke fallback voor elke pagina zonder eigen, specifiekere
// loading.tsx (bv. Instellingen, Zoeken, en Home zelf — die deelt dit
// segment met deze fallback, dus kan geen eigen loading.tsx krijgen zonder
// de routestructuur te wijzigen) — pagina's met een heel eigen vorm
// (ledenlijst, bedrijvenlijst, agenda, community, documenten, Beheer,
// Statistieken, Notificaties) hebben hun eigen loading.tsx die dit
// overschrijft.
export default function AppLoading() {
  return (
    <div className="flex flex-col gap-4">
      {/* h-9: zelfde hoogte als een <h1>/PageHeader-titel elders, zodat een
          titel die hierna verschijnt niet verticaal springt. */}
      <Skeleton className="h-9 w-48" />
      <Skeleton className="h-32 w-full rounded-2xl" />
      <Skeleton className="h-32 w-full rounded-2xl" />
    </div>
  );
}
