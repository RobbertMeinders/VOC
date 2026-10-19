import Link from "next/link";
import Image from "next/image";
import { clsx } from "clsx";
import { CalendarDays, CheckCircle2, Clock, MapPin, Users, XCircle } from "lucide-react";
import { formatActivityDate, formatActivityTimeOnly } from "@/lib/format/date";
import { activityHref } from "@/lib/agenda/slug";
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

  // Redesign: de soort activiteit (VOC/extern) staat nu al in de gekleurde
  // linkerrand van de kaart (zie hieronder) — de losse rode "VOC-activiteit"-
  // badge zou dat dubbelop zeggen, dus wordt neutraal grijs i.p.v. gevuld
  // rood. Statusbadges (afgelast/wachtlijst/aangemeld) volgen de nieuwe
  // status-tokens.
  const badges = (
    <div className="mt-2 flex flex-wrap items-center gap-2">
      {isOfficial && (
        <span className="rounded-full bg-status-neutral-soft px-2 py-0.5 text-xs font-medium text-status-neutral">
          VOC
        </span>
      )}
      {isSubmitted && (
        <span className="rounded-full bg-status-neutral-soft px-2 py-0.5 text-xs font-medium text-status-neutral">
          Extern
        </span>
      )}
      {activity.status === "pending" && (
        <span className="flex items-center gap-1 rounded-full bg-status-warning-soft px-2 py-0.5 text-xs font-medium text-status-warning">
          <Clock size={11} />
          Ter goedkeuring
        </span>
      )}
      {activity.status === "cancelled" && (
        <span className="flex items-center gap-1 rounded-full bg-danger-soft px-2 py-0.5 text-xs font-medium text-danger-text">
          <XCircle size={11} />
          Afgelast
        </span>
      )}
      {isRegistered && !isWaitlisted && (
        <span className="flex items-center gap-1 rounded-full bg-status-success-soft px-2 py-0.5 text-xs font-medium text-status-success">
          <CheckCircle2 size={11} />
          Je bent aangemeld
        </span>
      )}
      {isWaitlisted && (
        <span className="flex items-center gap-1 rounded-full bg-status-warning-soft px-2 py-0.5 text-xs font-medium text-status-warning">
          <Clock size={11} />
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
        href={activityHref(activity)}
        className="card-hover-lift animate-rise-in overflow-hidden rounded-2xl border border-border bg-surface shadow-sm hover:border-foreground/20"
      >
        {imageUrl ? (
          <div className="relative h-44 w-full sm:h-52">
            <Image src={imageUrl} alt={activity.title} fill sizes="(min-width: 640px) 700px, 100vw" className="object-cover" />
          </div>
        ) : (
          <div className="flex h-44 w-full items-center justify-center bg-petrol-soft text-petrol sm:h-52">
            <CalendarDays size={48} />
          </div>
        )}
        <div className="p-5">
          <p className="line-clamp-2 text-xl font-semibold leading-snug text-foreground">{activity.title}</p>
          <p className="mt-1 text-sm text-muted">{formatActivityDate(activity.starts_at)}</p>
          {activity.location && (
            <p className="mt-0.5 flex items-center gap-1 truncate text-sm text-muted">
              <MapPin size={14} className="shrink-0" />
              {activity.location}
            </p>
          )}
          {badges}
        </div>
      </Link>
    );
  }

  // Redesign (sfeerronde-aanvulling): tijdlijnkaart — foto als vierkante
  // thumbnail links i.p.v. een band bovenaan, zodat kaarten zonder foto er
  // (met het kalender-tegeltje) gelijk mee uitlijnen. Gekleurde linkerrand
  // per soort (rood = VOC, petrol = extern) blijft. De datumkolom zelf staat
  // ernaast, in de aanroeper (agenda/page.tsx) — hierbinnen daarom alleen
  // tijd + plaats op één regel, anders staat de datum er dubbel.
  //
  // Live QA: een border-left met een conditionele kleur (actief/niet, VOC/
  // extern) bleek in de praktijk onzichtbaar op een element dat ook
  // overflow-hidden + rounded-2xl + een composited hover-transform heeft
  // (zelfde patroon brak ook in HamburgerMenu's actieve-item-streepje) —
  // een los, absoluut gepositioneerd staafje binnen de overflow-hidden-grens
  // i.p.v. een border-left omzeilt dat.
  return (
    <Link
      href={activityHref(activity)}
      className="card-hover-lift animate-rise-in relative flex items-start gap-3 overflow-hidden rounded-2xl bg-surface p-3 shadow-sm"
    >
      <span
        aria-hidden
        className={clsx("absolute inset-y-0 left-0 z-10 w-1", isOfficial ? "bg-voc-red" : "bg-petrol")}
      />
      {imageUrl ? (
        <div className="relative h-[72px] w-[72px] shrink-0 overflow-hidden rounded-xl sm:h-[88px] sm:w-[88px]">
          <Image src={imageUrl} alt="" fill sizes="88px" className="object-cover" />
        </div>
      ) : (
        <div className="flex h-[72px] w-[72px] shrink-0 items-center justify-center rounded-xl bg-petrol-soft text-petrol sm:h-[88px] sm:w-[88px]">
          <CalendarDays size={28} />
        </div>
      )}
      <div className="min-w-0 flex-1">
        <p className={clsx("line-clamp-2 font-semibold leading-snug text-foreground", isSubmitted ? "text-sm" : "text-base")}>
          {activity.title}
        </p>
        <p className="mt-1 truncate text-sm text-muted">
          {formatActivityTimeOnly(activity.starts_at)}
          {/* Ingebracht mag compacter: de plaats weg (staat nog op de detailpagina). */}
          {activity.location && !isSubmitted ? ` · ${activity.location}` : ""}
        </p>
        {badges}
      </div>
    </Link>
  );
}
