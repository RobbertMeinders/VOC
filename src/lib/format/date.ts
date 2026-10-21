// Pinned to Europe/Amsterdam explicitly rather than the executing
// environment's own local timezone: a Vercel serverless function usually
// runs in UTC, so leaving the timezone implicit showed the wrong wall-clock
// time to Dutch visitors (and, worse, produced a different string on the
// server than on the client for anything computed client-side too).
const NL_TIMEZONE = "Europe/Amsterdam";

export function formatActivityDate(iso: string): string {
  return new Intl.DateTimeFormat("nl-NL", {
    timeZone: NL_TIMEZONE,
    weekday: "long",
    day: "numeric",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

// Home-welkomstblok (activiteitkaart): "di 3 nov" — korte weekdag + dag +
// maand, zonder tijd (die staat er met de locatie apart naast, zie
// HomePage). formatActivityDate's volledige vorm ("maandag 3 november,
// 16:00") bleek in die smalle kaart de knop eronder te verdringen.
export function formatActivityDateCompact(iso: string): string {
  return new Intl.DateTimeFormat("nl-NL", {
    timeZone: NL_TIMEZONE,
    weekday: "short",
    day: "numeric",
    month: "short",
  }).format(new Date(iso));
}

export function formatActivityDateShort(iso: string): string {
  return new Intl.DateTimeFormat("nl-NL", {
    timeZone: NL_TIMEZONE,
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

// Maandkopje voor het groeperen van de agendalijst (bv. "Oktober 2026") —
// Intl geeft de maandnaam standaard met kleine letter terug.
export function formatMonthLabel(iso: string): string {
  const label = new Intl.DateTimeFormat("nl-NL", { timeZone: NL_TIMEZONE, month: "long", year: "numeric" }).format(
    new Date(iso)
  );
  return label.charAt(0).toUpperCase() + label.slice(1);
}

export function formatActivityTimeOnly(iso: string): string {
  return new Intl.DateTimeFormat("nl-NL", {
    timeZone: NL_TIMEZONE,
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

// Board-only "laatst actief" display (see profiles.last_active_at, kept
// current by a client heartbeat — OnlineHeartbeat — while a tab is open,
// not just at login). Used server-side only (member detail page), so
// there's no client/server hydration-mismatch concern from Date.now() here.
export function formatLastActive(iso: string | null): string {
  if (!iso) return "Nog nooit ingelogd";

  const days = Math.floor((Date.now() - new Date(iso).getTime()) / (24 * 60 * 60 * 1000));
  if (days <= 0) return "Vandaag";
  if (days === 1) return "Gisteren";
  if (days < 30) return `${days} dagen geleden`;
  return new Intl.DateTimeFormat("nl-NL", { timeZone: NL_TIMEZONE, day: "numeric", month: "short", year: "numeric" }).format(
    new Date(iso)
  );
}

// Relatieve tijd voor de community-feed (berichten/reacties). Client-only
// (PostCard e.a. zijn "use client"), dus Date.now() hier geeft geen
// server/client-hydratatiemismatch.
export function formatRelativeTime(iso: string): string {
  const date = new Date(iso);
  const minutes = Math.floor((Date.now() - date.getTime()) / (60 * 1000));

  if (minutes < 1) return "Nu";
  if (minutes <= 59) return `${minutes}m geleden`;

  const hours = Math.floor(minutes / 60);
  if (hours <= 23) return `${hours}u geleden`;

  const days = Math.floor(hours / 24);
  if (days <= 7) return `${days}d geleden`;

  const weeks = Math.floor(days / 7);
  if (weeks <= 4) return `${weeks}w geleden`;

  return new Intl.DateTimeFormat("nl-NL", {
    timeZone: NL_TIMEZONE,
    day: "numeric",
    month: "short",
    ...(days >= 365 ? { year: "numeric" as const } : {}),
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

// Home-welkomstblok: "Maandag 19 oktober" — zonder jaar/tijd, dat hoort hier
// niet (het is een kop, geen tijdstempel). Zelfde Europe/Amsterdam-pin als
// de rest van dit bestand, hier extra relevant: dit draait server-side bij
// elke paginaweergave (geen client-only Date.now() zoals formatRelativeTime).
export function formatTodayLabel(): string {
  const label = new Intl.DateTimeFormat("nl-NL", { timeZone: NL_TIMEZONE, weekday: "long", day: "numeric", month: "long" }).format(
    new Date()
  );
  return label.charAt(0).toUpperCase() + label.slice(1);
}

// Tijdstip-afhankelijke begroeting voor het welkomstblok — expliciet op
// Europe/Amsterdam i.p.v. de serverklok zelf, anders zou een server buiten
// Europa 's ochtends voor Nederlandse leden al "Goedenavond" tonen.
export function getGreeting(): string {
  const hour = Number(
    new Intl.DateTimeFormat("nl-NL", { timeZone: NL_TIMEZONE, hour: "numeric", hourCycle: "h23" }).format(new Date())
  );
  if (hour < 12) return "Goedemorgen";
  if (hour < 18) return "Goedemiddag";
  return "Goedenavond";
}

/**
 * Split activities into upcoming (soonest first) and past (most recent
 * first). Pulled out of the page component because calling `Date.now()`
 * directly in a component body trips the react-hooks/purity lint rule.
 */
export function splitUpcomingAndPast<T extends { starts_at: string }>(items: T[]): { upcoming: T[]; past: T[] } {
  const now = Date.now();
  // B2 (eerste testsuite): `upcoming` werd nooit zelf gesorteerd — alleen de
  // enige huidige aanroeper (agenda/page.tsx) haalt activiteiten al
  // oplopend-gesorteerd op, wat de "soonest first"-belofte hierboven toevallig
  // waarmaakte. Een sort hier maakt de functie ook correct voor een
  // ongesorteerde input, i.p.v. stilletjes op de aanroeper te vertrouwen.
  const upcoming = items
    .filter((item) => new Date(item.starts_at).getTime() >= now)
    .sort((a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime());
  const past = items
    .filter((item) => new Date(item.starts_at).getTime() < now)
    .sort((a, b) => new Date(b.starts_at).getTime() - new Date(a.starts_at).getTime());
  return { upcoming, past };
}
