import { Skeleton } from "@/components/ui/Skeleton";

function PostCardSkeleton() {
  return (
    <div className="rounded-2xl bg-surface p-4 shadow-sm">
      <div className="flex items-center gap-3">
        <Skeleton className="h-10 w-10 shrink-0 rounded-full" />
        <div className="min-w-0 flex-1">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="mt-1.5 h-3 w-20" />
        </div>
      </div>
      <Skeleton className="mt-3 h-4 w-full" />
      <Skeleton className="mt-2 h-4 w-4/5" />
    </div>
  );
}

// Geen eigen max-w-wrapper hier — AppShell's contentWidth zet /community
// zelf al op "lijst" (960px); een binnenste md:max-w-3xl (768px) gaf een
// zichtbare breedtesprong zodra de echte (bredere) inhoud binnenkwam.
export default function CommunityLoading() {
  return (
    <div className="flex flex-col gap-4">
      {/* h-9: zelfde hoogte als de echte <h1> op deze pagina. */}
      <Skeleton className="h-9 w-40" />
      <Skeleton className="h-14 w-full rounded-2xl" />
      <div className="flex gap-1.5">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-6 w-16 rounded-full" />
        ))}
      </div>
      {Array.from({ length: 3 }).map((_, i) => (
        <PostCardSkeleton key={i} />
      ))}
    </div>
  );
}
