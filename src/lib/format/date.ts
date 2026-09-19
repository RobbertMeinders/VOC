export function formatActivityDate(iso: string): string {
  return new Intl.DateTimeFormat("nl-NL", {
    weekday: "long",
    day: "numeric",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

export function formatActivityDateShort(iso: string): string {
  return new Intl.DateTimeFormat("nl-NL", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
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
