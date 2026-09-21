import Link from "next/link";
import Image from "next/image";
import { CalendarDays, MapPin, Users } from "lucide-react";
import { formatActivityDate } from "@/lib/format/date";
import type { Database } from "@/lib/types/database";

type Activity = Database["public"]["Tables"]["activities"]["Row"];

export function ActivityCard({
  activity,
  imageUrl,
  registrationCount,
  isRegistered,
}: {
  activity: Activity;
  imageUrl: string | null;
  registrationCount: number;
  isRegistered: boolean;
}) {
  const isFull = activity.max_participants !== null && registrationCount >= activity.max_participants;

  return (
    <Link
      href={`/agenda/${activity.id}`}
      className="flex gap-4 rounded-2xl border border-border bg-surface p-4 shadow-sm hover:border-voc-red"
    >
      {imageUrl ? (
        <Image
          src={imageUrl}
          alt={activity.title}
          width={96}
          height={96}
          className="h-24 w-24 shrink-0 rounded-xl object-cover"
        />
      ) : (
        <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-xl bg-voc-red-light text-voc-red">
          <CalendarDays size={30} />
        </div>
      )}
      <div className="min-w-0 flex-1">
        <p className="truncate text-base font-semibold text-foreground">{activity.title}</p>
        <p className="mt-0.5 text-sm text-muted">{formatActivityDate(activity.starts_at)}</p>
        {activity.location && (
          <p className="mt-0.5 flex items-center gap-1 truncate text-sm text-muted">
            <MapPin size={14} />
            {activity.location}
          </p>
        )}
        <div className="mt-2 flex flex-wrap items-center gap-2">
          {activity.source === "lid" && (
            <span className="rounded-full bg-black/[.06] px-2 py-0.5 text-xs font-medium text-muted dark:bg-white/[.08]">
              Community
            </span>
          )}
          {activity.status === "pending" && (
            <span className="rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700 dark:bg-amber-500/10 dark:text-amber-400">
              Ter goedkeuring
            </span>
          )}
          {isRegistered && (
            <span className="rounded-full bg-green-50 px-2 py-0.5 text-xs font-medium text-green-700 dark:bg-green-500/10 dark:text-green-400">
              Je bent aangemeld
            </span>
          )}
          <span className="flex items-center gap-1 text-xs text-muted">
            <Users size={13} />
            {registrationCount}
            {activity.max_participants ? `/${activity.max_participants}` : ""}
            {isFull && !isRegistered ? " · vol" : ""}
          </span>
        </div>
      </div>
    </Link>
  );
}
