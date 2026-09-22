import { Skeleton } from "@/components/ui/Skeleton";

function MemberRowSkeleton() {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-border bg-surface p-4 shadow-sm">
      <Skeleton className="h-12 w-12 shrink-0 rounded-full" />
      <div className="min-w-0 flex-1">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="mt-1.5 h-3 w-24" />
      </div>
    </div>
  );
}

export default function LedenLoading() {
  return (
    <div>
      <Skeleton className="mb-3 h-6 w-32" />
      <Skeleton className="mb-4 h-9 w-48 rounded-full" />
      <Skeleton className="mb-4 h-10 w-full rounded-xl" />
      <div className="grid gap-3 sm:grid-cols-2">
        {Array.from({ length: 8 }).map((_, i) => (
          <MemberRowSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}
