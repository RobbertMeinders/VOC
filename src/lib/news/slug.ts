// Nieuwsberichten hebben al een leesbare, unieke `slug`-kolom (bv.
// "nieuwe-website-live" i.p.v. een kale uuid) — zie
// createNewsItemAction en migratie 0156_news_items_slug.sql (backfilled
// voor elke bestaande rij, dus gegarandeerd aanwezig). Blijft, net als
// leden/bedrijven, voor altijd stabiel: geen regeneratie bij een
// titelwijziging, dus ook geen alias-tabel nodig (vergelijk agenda/slug.ts).
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function newsItemHref(newsItem: { slug: string }, suffix = ""): string {
  return `/nieuws/${newsItem.slug}${suffix}`;
}

// Oude, rechtstreeks verstuurde links (kaal UUID) blijven gewoon werken —
// zie memberIdFilter/activityIdFilter voor dezelfde uitleg.
export function newsItemIdFilter(param: string): [string, string, string] {
  return UUID_RE.test(param) ? ["id", "eq", param] : ["slug", "eq", param];
}
