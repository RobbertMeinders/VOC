import { Skeleton } from "@/components/ui/Skeleton";

function CompanyCardSkeleton() {
  return (
    <div className="flex min-w-0 items-center gap-4 rounded-2xl border border-border bg-surface p-4 shadow-sm">
      <Skeleton className="h-20 w-20 shrink-0 rounded-xl" />
      <div className="min-w-0 flex-1">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="mt-2 h-3 w-1/2" />
      </div>
    </div>
  );
}

export default function BedrijvenLoading() {
  return (
    <div>
      <Skeleton className="mb-3 h-6 w-32" />
      <Skeleton className="mb-4 h-9 w-48 rounded-full" />
      <Skeleton className="mb-4 h-10 w-full rounded-xl" />
      <div className="grid gap-3 sm:grid-cols-2">
        {Array.from({ length: 8 }).map((_, i) => (
          <CompanyCardSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}
