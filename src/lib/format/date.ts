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

export function formatActivityDateShort(iso: string): string {
  return new Intl.DateTimeFormat("nl-NL", {
    timeZone: NL_TIMEZONE,
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
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

/**
 * Split activities into upcoming (soonest first) and past (most recent
 * first). Pulled out of the page component because calling `Date.now()`
 * directly in a component body trips the react-hooks/purity lint rule.
 */
export function splitUpcomingAndPast<T extends { starts_at: string }>(items: T[]): { upcoming: T[]; past: T[] } {
  const now = Date.now();
  const upcoming = items.filter((item) => new Date(item.starts_at).getTime() >= now);
  const past = items
    .filter((item) => new Date(item.starts_at).getTime() < now)
    .sort((a, b) => new Date(b.starts_at).getTime() - new Date(a.starts_at).getTime());
  return { upcoming, past };
}
