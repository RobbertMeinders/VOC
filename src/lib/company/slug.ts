// URL-ronde: bedrijven krijgen een leesbare URL net als leden
// (lib/members/slug.ts) — companies.slug bestaat al sinds 0096, blijft
// stabiel bij een naamswijziging (verandert niet mee, anders breekt een
// eerder gedeelde link).
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function companyHref(company: { slug: string }, suffix = ""): string {
  return `/bedrijven/${company.slug}${suffix}`;
}

// Oude, rechtstreeks verstuurde links (kaal UUID) blijven werken — de
// aanroepende pagina stuurt in dat geval door naar de canonieke slug-URL
// (zie CompanyProfileContent).
export function companyIdFilter(param: string): [string, string, string] {
  return UUID_RE.test(param) ? ["id", "eq", param] : ["slug", "eq", param];
}
