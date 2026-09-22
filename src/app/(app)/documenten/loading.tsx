import { Skeleton } from "@/components/ui/Skeleton";

function DocumentRowSkeleton() {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-border bg-surface p-3 shadow-sm">
      <Skeleton className="h-10 w-10 shrink-0 rounded-lg" />
      <div className="min-w-0 flex-1">
        <Skeleton className="h-4 w-1/2" />
        <Skeleton className="mt-1.5 h-3 w-1/4" />
      </div>
      <Skeleton className="h-8 w-8 shrink-0 rounded-full" />
    </div>
  );
}

export default function DocumentenLoading() {
  return (
    <div className="flex flex-col gap-4">
      <Skeleton className="h-6 w-36" />
      <Skeleton className="h-10 w-full rounded-xl" />
      <div className="flex flex-col gap-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <DocumentRowSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}
