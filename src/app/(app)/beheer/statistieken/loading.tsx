import { Skeleton } from "@/components/ui/Skeleton";

// Vorm-eigen skelet voor de statistiekenpagina (tabs + KPI-tegels +
// grafiekkaarten) i.p.v. de generieke fallback.
export default function StatistiekenLoading() {
  return (
    <div className="flex flex-col gap-4">
      {/* h-9: zelfde hoogte als PageHeader's <h1>. */}
      <Skeleton className="h-9 w-40" />
      <div className="flex gap-1.5">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-11 w-24 rounded-full" />
        ))}
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-24 rounded-2xl" />
        ))}
      </div>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        {Array.from({ length: 2 }).map((_, i) => (
          <Skeleton key={i} className="h-64 rounded-2xl" />
        ))}
      </div>
    </div>
  );
}
