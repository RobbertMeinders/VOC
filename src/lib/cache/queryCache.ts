import "server-only";

// Zelfde patroon als de signed-URL-cache in lib/supabase/storage.ts: een
// simpele per-serverproces cache voor querys waarvan het resultaat voor elk
// actief lid identiek is (RLS met alleen `is_active_member()`, geen
// per-gebruiker variatie). Alleen gebruiken voor zulke querys — zodra
// zichtbaarheid per rol/gebruiker verschilt (bv. agenda, waar iemands eigen
// nog-niet-beoordeelde inzending wel/niet zichtbaar is), is delen tussen
// gebruikers fout.
const cache = new Map<string, { value: unknown; expiresAt: number }>();

// PromiseLike i.p.v. Promise: Supabase's query builders zijn thenable maar
// geen echte Promise (geen .catch/.finally), waardoor TypeScript T anders
// niet kan afleiden uit `() => supabase.from(...).select(...)`.
export async function cachedQuery<T>(key: string, ttlMs: number, fn: () => PromiseLike<T>): Promise<T> {
  const cached = cache.get(key);
  const now = Date.now();
  if (cached && cached.expiresAt > now) {
    return cached.value as T;
  }

  const value = await fn();
  cache.set(key, { value, expiresAt: now + ttlMs });
  return value;
}

// Aanroepen naast revalidatePath() in server actions die de onderliggende
// data wijzigen, anders blijft de cache tot wel 60s de oude data teruggeven
// aan degene die de wijziging zelf net heeft gedaan.
export function invalidateQuery(key: string): void {
  cache.delete(key);
}
