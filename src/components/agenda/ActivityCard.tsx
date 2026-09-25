import Link from "next/link";
import Image from "next/image";
import { clsx } from "clsx";
import { CalendarDays, MapPin, Users } from "lucide-react";
import { formatActivityDate } from "@/lib/format/date";
import type { Database } from "@/lib/types/database";

type Activity = Database["public"]["Tables"]["activities"]["Row"];

export function ActivityCard({
  activity,
  imageUrl,
  registrationCount,
  isRegistered,
  isWaitlisted,
  submitterLabel,
}: {
  activity: Activity;
  imageUrl: string | null;
  registrationCount: number;
  isRegistered: boolean;
  isWaitlisted?: boolean;
  submitterLabel?: string | null;
}) {
  const isFull = activity.max_participants !== null && registrationCount >= activity.max_participants;
  // Een officiële Activiteit mag wat prominenter ogen dan een Ingebracht
  // evenement (compacter/neutraler) — vandaar de accentrand hier i.p.v. een
  // apart badge dat elke kaart evenveel gewicht zou geven. Ingebracht krijgt
  // dezelfde rand, maar in grijs i.p.v. rood.
  const isOfficial = activity.source === "voc";
  const isSubmitted = activity.source === "lid";

  // Ingebracht is bewust compacter dan een officiële VOC-activiteit (kleinere
  // afbeelding, minder padding) — dat geeft naast de grijze i.p.v. rode rand
  // een tweede, meteen zichtbaar verschil tussen de twee soorten.
  const imageSize = isSubmitted ? 80 : 112;

  return (
    <Link
      href={`/agenda/${activity.id}`}
      className={clsx(
        "animate-rise-in flex gap-4 rounded-2xl border border-border bg-surface shadow-sm transition-all duration-150 hover:-translate-y-0.5 hover:border-voc-red hover:shadow-md",
        isSubmitted ? "p-4" : "p-5",
        (isOfficial || isSubmitted) && "border-l-4"
      )}
      style={isOfficial ? { borderLeftColor: "var(--voc-red)" } : isSubmitted ? { borderLeftColor: "var(--muted)" } : undefined}
    >
      {imageUrl ? (
        <Image
          src={imageUrl}
          alt={activity.title}
          width={imageSize}
          height={imageSize}
          className="shrink-0 rounded-xl object-cover"
          style={{ height: imageSize, width: imageSize }}
        />
      ) : (
        <div
          className="flex shrink-0 items-center justify-center rounded-xl bg-voc-red-light text-voc-red"
          style={{ height: imageSize, width: imageSize }}
        >
          <CalendarDays size={isSubmitted ? 26 : 34} />
        </div>
      )}
      <div className="min-w-0 flex-1">
        <p className={clsx("line-clamp-2 font-semibold leading-snug text-foreground", isSubmitted ? "text-base" : "text-lg")}>
          {activity.title}
        </p>
        <p className="mt-1 text-sm text-muted">{formatActivityDate(activity.starts_at)}</p>
        {activity.location && (
          <p className="mt-0.5 flex items-center gap-1 truncate text-sm text-muted">
            <MapPin size={14} />
            {activity.location}
          </p>
        )}
        {isSubmitted && submitterLabel && <p className="mt-0.5 truncate text-xs text-muted">Ingebracht door {submitterLabel}</p>}
        <div className="mt-2 flex flex-wrap items-center gap-2">
          {isSubmitted && !submitterLabel && (
            <span className="rounded-full bg-black/[.06] px-2 py-0.5 text-xs font-medium text-muted dark:bg-white/[.08]">
              Ingebracht
            </span>
          )}
          {activity.status === "pending" && (
            <span className="rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700 dark:bg-amber-500/10 dark:text-amber-400">
              Ter goedkeuring
            </span>
          )}
          {isRegistered && !isWaitlisted && (
            <span className="rounded-full bg-green-50 px-2 py-0.5 text-xs font-medium text-green-700 dark:bg-green-500/10 dark:text-green-400">
              Je bent aangemeld
            </span>
          )}
          {isWaitlisted && (
            <span className="rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700 dark:bg-amber-500/10 dark:text-amber-400">
              Op de wachtlijst
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
