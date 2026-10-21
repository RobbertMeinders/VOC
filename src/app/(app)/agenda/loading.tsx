import { Skeleton } from "@/components/ui/Skeleton";

function ActivityCardSkeleton() {
  return (
    <div className="flex gap-3 rounded-2xl bg-surface p-4 shadow-sm">
      <Skeleton className="h-20 w-20 shrink-0 rounded-xl" />
      <div className="min-w-0 flex-1">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="mt-2 h-3 w-1/2" />
        <Skeleton className="mt-1.5 h-3 w-1/3" />
      </div>
    </div>
  );
}

// Geen eigen max-w-wrapper hier — AppShell's contentWidth zet /agenda zelf
// al op "lijst" (960px); een binnenste md:max-w-3xl (768px) gaf een
// zichtbare breedtesprong zodra de echte (bredere) inhoud binnenkwam.
export default function AgendaLoading() {
  return (
    <div className="flex flex-col gap-4">
      {/* h-9: zelfde hoogte als de echte <h1> op deze pagina (tekst-[1.75rem]
          + leading), zodat de titel niet verticaal springt zodra hij verschijnt. */}
      <div className="flex items-center justify-between">
        <Skeleton className="h-9 w-24" />
        <Skeleton className="h-11 w-32 rounded-full" />
      </div>
      <div className="flex gap-1.5">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-8 w-24 rounded-full" />
        ))}
      </div>
      <div className="flex flex-col gap-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <ActivityCardSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}
