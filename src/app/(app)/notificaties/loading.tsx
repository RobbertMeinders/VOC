import { Skeleton } from "@/components/ui/Skeleton";

// Vorm-eigen skelet voor de meldingenlijst i.p.v. de generieke fallback.
export default function NotificatiesLoading() {
  return (
    <div className="flex flex-col gap-4">
      {/* h-9: zelfde hoogte als de echte <h1> ("Meldingen"). */}
      <Skeleton className="h-9 w-40" />
      <div className="flex flex-col gap-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 rounded-2xl bg-surface p-4 shadow-sm">
            <Skeleton className="h-10 w-10 shrink-0 rounded-full" />
            <div className="min-w-0 flex-1">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="mt-1.5 h-3 w-1/3" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
