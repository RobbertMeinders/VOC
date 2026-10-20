// Leden hebben al een leesbare, unieke `slug`-kolom (bv. "robbert-meinders"
// i.p.v. een kale uuid) — zie handle_new_user() en migratie
// 0122_profile_slug.sql (backfilled voor elke bestaande rij, dus
// gegarandeerd aanwezig). Zelfde patroon als lib/agenda/slug.ts voor
// activiteiten.
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function memberHref(member: { slug: string }, suffix = ""): string {
  return `/leden/${member.slug}${suffix}`;
}

// Oude, rechtstreeks verstuurde links (kaal UUID) blijven gewoon werken —
// zie activityIdFilter voor dezelfde uitleg.
export function memberIdFilter(param: string): [string, string, string] {
  return UUID_RE.test(param) ? ["id", "eq", param] : ["slug", "eq", param];
}
