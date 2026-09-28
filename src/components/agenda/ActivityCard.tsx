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
  hero = false,
}: {
  activity: Activity;
  imageUrl: string | null;
  registrationCount: number;
  isRegistered: boolean;
  isWaitlisted?: boolean;
  hero?: boolean;
}) {
  const isFull = activity.max_participants !== null && registrationCount >= activity.max_participants;
  // Een officiële Activiteit mag wat prominenter ogen dan een Ingebracht
  // evenement (compacter/neutraler) — vandaar de accentrand hier i.p.v. een
  // apart badge dat elke kaart evenveel gewicht zou geven. Ingebracht krijgt
  // dezelfde rand, maar in grijs i.p.v. rood.
  const isOfficial = activity.source === "voc";
  const isSubmitted = activity.source === "lid";

  // Ingebracht is even breed als een officiële activiteit (zelfde
  // beeldverhouding-taal), maar lager — samen met wat minder padding en het
  // weglaten van de "ingebracht door"-regel (wie het was is niet cruciaal in
  // dit overzicht, wel op de detailpagina) zorgt dat ervoor dat de titel op
  // dezelfde hoogte begint als bij een officiële activiteit i.p.v. dat de
  // afbeelding er middenin "zweeft" door een hoger tekstblok.
  const imageWidth = 112;
  const imageHeight = isSubmitted ? 64 : 112;

  const borderStyle = isOfficial
    ? { borderLeftColor: "var(--voc-red)" }
    : isSubmitted
      ? { borderLeftColor: "var(--muted)" }
      : undefined;

  const badges = (
    <div className="mt-2 flex flex-wrap items-center gap-2">
      {isSubmitted && (
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
  );

  // De eerstvolgende activiteit mag er als "hero" uitspringen boven de rest
  // van de lijst: een bredere banner-afbeelding boven de tekst i.p.v.
  // ernaast, en een groter kopje — zelfde kaart-taal (rand, badges), alleen
  // prominenter.
  if (hero) {
    return (
      <Link
        href={`/agenda/${activity.id}`}
        className={clsx(
          "animate-rise-in overflow-hidden rounded-2xl border border-border bg-surface shadow-sm transition-all duration-150 hover:scale-[1.01] hover:border-voc-red hover:shadow-md",
          (isOfficial || isSubmitted) && "border-l-4"
        )}
        style={borderStyle}
      >
        {imageUrl ? (
          <div className="relative h-44 w-full sm:h-52">
            <Image src={imageUrl} alt={activity.title} fill sizes="(min-width: 640px) 700px, 100vw" className="object-cover" />
          </div>
        ) : (
          <div className="flex h-44 w-full items-center justify-center bg-voc-red-light text-voc-red sm:h-52">
            <CalendarDays size={48} />
          </div>
        )}
        <div className="p-5">
          <p className="line-clamp-2 text-xl font-semibold leading-snug text-foreground">{activity.title}</p>
          <p className="mt-1 text-sm text-muted">{formatActivityDate(activity.starts_at)}</p>
          {activity.location && (
            <p className="mt-0.5 flex items-center gap-1 truncate text-sm text-muted">
              <MapPin size={14} />
              {activity.location}
            </p>
          )}
          {badges}
        </div>
      </Link>
    );
  }

  return (
    <Link
      href={`/agenda/${activity.id}`}
      className={clsx(
        "animate-rise-in flex items-start gap-4 rounded-2xl border border-border bg-surface shadow-sm transition-all duration-150 hover:scale-[1.02] hover:border-voc-red hover:shadow-md",
        isSubmitted ? "p-4" : "p-5",
        (isOfficial || isSubmitted) && "border-l-4"
      )}
      style={borderStyle}
    >
      {imageUrl ? (
        <Image
          src={imageUrl}
          alt={activity.title}
          width={imageWidth}
          height={imageHeight}
          className="shrink-0 rounded-xl object-cover"
          style={{ height: imageHeight, width: imageWidth }}
        />
      ) : (
        <div
          className="flex shrink-0 items-center justify-center rounded-xl bg-voc-red-light text-voc-red"
          style={{ height: imageHeight, width: imageWidth }}
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
        {badges}
      </div>
    </Link>
  );
}
