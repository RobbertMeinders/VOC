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
  const isOfficial = activity.source === "voc";
  const isSubmitted = activity.source === "lid";

  // Ingebracht is even breed als een officiële activiteit (zelfde
  // beeldverhouding-taal), maar de kaart zelf is lager (minder padding, geen
  // "ingebracht door"-regel — wie het was staat nog op de detailpagina). De
  // afbeelding krijgt daarom geen eigen vaste hoogte: die rekt (via flex
  // items-stretch, de default) automatisch mee tot precies de hoogte die het
  // tekstblok ernaast al inneemt, wat dat ook is — i.p.v. een losse
  // schatting die zelf weer niet klopt zodra de tekst wat korter/langer is.
  const imageWidth = 112;

  const badges = (
    <div className="mt-2 flex flex-wrap items-center gap-2">
      {isOfficial && (
        <span className="rounded-full bg-voc-red-light px-2 py-0.5 text-xs font-medium text-voc-red">
          VOC-activiteit
        </span>
      )}
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
  // ernaast, en een groter kopje — zelfde kaart-taal (badges), alleen
  // prominenter.
  if (hero) {
    return (
      <Link
        href={`/agenda/${activity.id}`}
        className="animate-rise-in overflow-hidden rounded-2xl border border-border bg-surface shadow-sm transition-all duration-500 ease-out hover:scale-[1.005] hover:border-voc-red hover:shadow-md"
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
        "animate-rise-in flex gap-4 rounded-2xl border border-border bg-surface shadow-sm transition-all duration-500 ease-out hover:scale-[1.008] hover:border-voc-red hover:shadow-md",
        isSubmitted ? "p-4" : "p-5"
      )}
    >
      {isSubmitted ? (
        imageUrl ? (
          <div className="relative shrink-0 self-stretch overflow-hidden rounded-xl" style={{ width: imageWidth }}>
            <Image src={imageUrl} alt={activity.title} fill sizes="112px" className="object-cover" />
          </div>
        ) : (
          <div
            className="flex shrink-0 items-center justify-center self-stretch rounded-xl bg-voc-red-light text-voc-red"
            style={{ width: imageWidth }}
          >
            <CalendarDays size={26} />
          </div>
        )
      ) : imageUrl ? (
        <Image
          src={imageUrl}
          alt={activity.title}
          width={imageWidth}
          height={imageWidth}
          className="shrink-0 self-start rounded-xl object-cover"
          style={{ height: imageWidth, width: imageWidth }}
        />
      ) : (
        <div
          className="flex shrink-0 items-center justify-center self-start rounded-xl bg-voc-red-light text-voc-red"
          style={{ height: imageWidth, width: imageWidth }}
        >
          <CalendarDays size={34} />
        </div>
      )}
      <div className="min-w-0 flex-1">
        <p className={clsx("line-clamp-2 font-semibold leading-snug text-foreground", isSubmitted ? "text-base" : "text-lg")}>
          {activity.title}
        </p>
        <p className="mt-1 text-sm text-muted">{formatActivityDate(activity.starts_at)}</p>
        {/* Ingebracht mag compacter: de locatieregel weg (staat nog op de
            detailpagina) — de afbeelding rekt via self-stretch toch al mee
            met de hoogte van dit tekstblok, dus dit maakt meteen ook de
            hele kaart lager. */}
        {activity.location && !isSubmitted && (
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
