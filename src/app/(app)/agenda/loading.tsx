import { Skeleton } from "@/components/ui/Skeleton";

function ActivityCardSkeleton() {
  return (
    <div className="flex gap-3 rounded-2xl border border-border bg-surface p-4 shadow-sm">
      <Skeleton className="h-20 w-20 shrink-0 rounded-xl" />
      <div className="min-w-0 flex-1">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="mt-2 h-3 w-1/2" />
        <Skeleton className="mt-1.5 h-3 w-1/3" />
      </div>
    </div>
  );
}

export default function AgendaLoading() {
  return (
    <div className="mx-auto w-full md:max-w-3xl">
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <Skeleton className="h-6 w-24" />
          <Skeleton className="h-9 w-9 rounded-full" />
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
    </div>
  );
}
