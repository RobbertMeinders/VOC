"use client";

import { useState } from "react";
import Link from "next/link";
import { CalendarDays } from "lucide-react";
import { formatActivityDateShort } from "@/lib/format/date";
import { AttendedActivitiesOverlay } from "./AttendedActivitiesOverlay";
import { MEMBER_PROFILE_LIST_PREVIEW } from "@/lib/feed/pagination";
import type { AttendedActivity } from "@/app/(app)/leden/[id]/list-actions";

// `activities` komt van de server als MEMBER_PROFILE_LIST_PREVIEW + 1 — bij
// meer dan het preview-aantal tonen we alleen de eerste 3 met een "Bekijk
// alle"-knop die de volledige, doorscrollende lijst als overlay opent.
export function AttendedActivitiesSection({ memberId, activities }: { memberId: string; activities: AttendedActivity[] }) {
  const [showAll, setShowAll] = useState(false);
  const preview = activities.slice(0, MEMBER_PROFILE_LIST_PREVIEW);
  const hasMore = activities.length > MEMBER_PROFILE_LIST_PREVIEW;

  return (
    <>
      <ul className="flex flex-col gap-2">
        {preview.map((activity) => (
          <li key={activity.id}>
            <Link
              href={`/agenda/${activity.id}`}
              className="flex items-center gap-3 rounded-lg px-1 py-1.5 text-sm hover:bg-black/[.04] dark:hover:bg-white/[.06]"
            >
              <CalendarDays size={16} className="shrink-0 text-muted" />
              <span className="min-w-0 flex-1 truncate text-foreground">{activity.title}</span>
              <span className="shrink-0 text-xs text-muted">{formatActivityDateShort(activity.starts_at)}</span>
            </Link>
          </li>
        ))}
      </ul>
      {hasMore && (
        <button
          type="button"
          onClick={() => setShowAll(true)}
          className="mt-2 w-full rounded-full border border-border py-1.5 text-center text-xs font-medium text-foreground hover:bg-black/[.04] dark:hover:bg-white/[.06]"
        >
          Bekijk alle bijgewoonde evenementen
        </button>
      )}
      {showAll && <AttendedActivitiesOverlay memberId={memberId} onClose={() => setShowAll(false)} />}
    </>
  );
}
