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
      className="flex gap-3 rounded-xl border border-border bg-surface p-3 shadow-sm hover:border-voc-red"
    >
      {imageUrl ? (
        <Image
          src={imageUrl}
          alt={activity.title}
          width={72}
          height={72}
          className="h-[72px] w-[72px] shrink-0 rounded-lg object-cover"
        />
      ) : (
        <div className="flex h-[72px] w-[72px] shrink-0 items-center justify-center rounded-lg bg-voc-red-light text-voc-red">
          <CalendarDays size={24} />
        </div>
      )}
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-foreground">{activity.title}</p>
        <p className="mt-0.5 text-xs text-muted">{formatActivityDate(activity.starts_at)}</p>
        {activity.location && (
          <p className="mt-0.5 flex items-center gap-1 truncate text-xs text-muted">
            <MapPin size={12} />
            {activity.location}
          </p>
        )}
        <div className="mt-1.5 flex items-center gap-2">
          {isRegistered && (
            <span className="rounded-full bg-green-50 px-2 py-0.5 text-[11px] font-medium text-green-700 dark:bg-green-500/10 dark:text-green-400">
              Je bent aangemeld
            </span>
          )}
          <span className="flex items-center gap-1 text-[11px] text-muted">
            <Users size={12} />
            {registrationCount}
            {activity.max_participants ? `/${activity.max_participants}` : ""}
            {isFull && !isRegistered ? " · vol" : ""}
          </span>
        </div>
      </div>
    </Link>
  );
}
