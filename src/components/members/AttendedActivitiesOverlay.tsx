"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { CalendarDays, X } from "lucide-react";
import { useEscapeKey } from "@/lib/dom/useEscapeKey";
import { useBodyScrollLock } from "@/lib/dom/useBodyScrollLock";
import { useInfiniteScroll } from "@/lib/dom/useInfiniteScroll";
import { formatActivityDateShort } from "@/lib/format/date";
import { getAttendedActivitiesPageAction, type AttendedActivity } from "@/app/(app)/leden/[id]/list-actions";
import { MEMBER_PROFILE_LIST_PAGE_SIZE } from "@/lib/feed/pagination";

// Haalt bij het openen zijn eigen eerste pagina op — zie MemberPostsOverlay
// voor de reden waarom dit niet de kleine preview-batch hergebruikt.
export function AttendedActivitiesOverlay({ memberId, onClose }: { memberId: string; onClose: () => void }) {
  const [activities, setActivities] = useState<AttendedActivity[] | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [isLoading, startLoading] = useTransition();

  useEscapeKey(true, onClose);
  useBodyScrollLock(true);

  useEffect(() => {
    void getAttendedActivitiesPageAction(memberId, 0).then((first) => {
      setActivities(first);
      if (first.length < MEMBER_PROFILE_LIST_PAGE_SIZE) setHasMore(false);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function loadMore() {
    if (isLoading || activities === null) return;
    startLoading(async () => {
      const next = await getAttendedActivitiesPageAction(memberId, activities.length);
      setActivities((prev) => [...(prev ?? []), ...next]);
      if (next.length < MEMBER_PROFILE_LIST_PAGE_SIZE) setHasMore(false);
    });
  }

  const sentinelRef = useInfiniteScroll(loadMore, hasMore && activities !== null);

  return (
    <>
      <div className="fixed inset-0 z-40 cursor-pointer bg-black/60 animate-fade-in" onClick={onClose} />
      <div className="fixed inset-x-3 top-1/2 z-50 -translate-y-1/2 sm:inset-x-0 sm:mx-auto sm:w-full sm:max-w-md sm:px-3">
        <div className="animate-scale-in flex max-h-[80vh] flex-col overflow-hidden rounded-2xl border border-border bg-surface shadow-lg">
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <p className="text-sm font-semibold text-foreground">Bijgewoonde evenementen</p>
            <button
              type="button"
              onClick={onClose}
              aria-label="Sluiten"
              className="flex h-7 w-7 items-center justify-center rounded-full text-muted hover:bg-black/[.04] hover:text-voc-red dark:hover:bg-white/[.08]"
            >
              <X size={16} />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-2">
            {activities === null && <p className="py-6 text-center text-sm text-muted">Laden…</p>}
            {activities?.map((activity) => (
              <Link
                key={activity.id}
                href={`/agenda/${activity.id}`}
                onClick={onClose}
                className="flex items-center gap-3 rounded-lg px-2 py-2 text-sm hover:bg-black/[.04] dark:hover:bg-white/[.06]"
              >
                <CalendarDays size={16} className="shrink-0 text-muted" />
                <span className="min-w-0 flex-1 truncate text-foreground">{activity.title}</span>
                <span className="shrink-0 text-xs text-muted">{formatActivityDateShort(activity.starts_at)}</span>
              </Link>
            ))}
            {hasMore && activities !== null && (
              <div ref={sentinelRef} className="py-3 text-center text-xs text-muted">
                {isLoading ? "Laden…" : ""}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
