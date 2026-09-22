import { Skeleton } from "@/components/ui/Skeleton";

export default function CompanyProfileLoading() {
  return (
    <div className="mx-auto w-full md:max-w-3xl">
      <div className="flex flex-col gap-6">
        <div className="rounded-2xl border border-border bg-surface p-6 shadow-sm">
          <div className="flex items-start gap-4">
            <Skeleton className="h-16 w-16 shrink-0 rounded-xl" />
            <div className="min-w-0 flex-1">
              <Skeleton className="h-5 w-48" />
              <Skeleton className="mt-2 h-4 w-32" />
              <Skeleton className="mt-3 h-4 w-56" />
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-surface p-6 shadow-sm">
          <Skeleton className="mb-3 h-4 w-48" />
          <div className="grid gap-3 sm:grid-cols-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3">
                <Skeleton className="h-10 w-10 shrink-0 rounded-full" />
                <Skeleton className="h-4 w-24" />
              </div>
            ))}
          </div>
        </div>

        <Skeleton className="h-64 w-full rounded-2xl" />
      </div>
    </div>
  );
}
