import "server-only";

import { unstable_cache, updateTag } from "next/cache";

// Gedeelde, cross-instance cache (Next.js Data Cache, via unstable_cache)
// voor querys waarvan het resultaat voor elk actief lid identiek is (RLS met
// alleen `is_active_member()`, geen per-gebruiker variatie). Alleen
// gebruiken voor zulke querys — zodra zichtbaarheid per rol/gebruiker
// verschilt (bv. agenda, waar iemands eigen nog-niet-beoordeelde inzending
// wel/niet zichtbaar is), is delen tussen gebruikers fout.
//
// Was eerst een simpele per-serverproces Map (zelfde patroon als de
// signed-URL-cache in lib/supabase/storage.ts), maar Vercel draait meestal
// meerdere instances tegelijk — invalidateQuery() wiste dan alleen de Map
// van de instance die de wijziging zelf deed, en elke andere instance bleef
// tot wel de volle TTL de oude data teruggeven. updateTag() werkt op de
// gedeelde Data Cache en geldt daardoor meteen voor alle instances.
//
// Belangrijk voor fn: mag zelf geen cookies()/headers() aanroepen (dus geen
// createClient() uit lib/supabase/server binnen deze functie) — bouw de
// Supabase-client vóór het aanroepen van cachedQuery en gebruik 'm alleen
// via closure. PromiseLike i.p.v. Promise: Supabase's query builders zijn
// thenable maar geen echte Promise (geen .catch/.finally).
export async function cachedQuery<T>(key: string, ttlMs: number, fn: () => PromiseLike<T>): Promise<T> {
  const run = unstable_cache(() => Promise.resolve(fn()), [key], {
    revalidate: Math.max(1, Math.round(ttlMs / 1000)),
    tags: [key],
  });
  return run();
}

// Aanroepen naast revalidatePath() in server actions die de onderliggende
// data wijzigen, anders blijft de cache tot de TTL verlopen is de oude data
// teruggeven — ook aan degene die de wijziging zelf net heeft gedaan.
// updateTag (i.p.v. revalidateTag) mag alleen binnen een server action
// aangeroepen worden, maar dat is ook precies elke bestaande aanroeper van
// deze functie — en geeft read-your-own-writes: de volgende lezing binnen
// dezelfde server-actionronde wacht op verse data i.p.v. nog even de oude
// gecachte waarde terug te geven.
export function invalidateQuery(key: string): void {
  updateTag(key);
}
