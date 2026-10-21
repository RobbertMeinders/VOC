import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/types/database";

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

// Bedrijfs-slugs kregen tot de opschoonbackfill (0163) een willekeurige/id-
// staart (bv. "capture-a61926fa") — die oude vorm kan al extern gedeeld/
// ingebed zijn (de publieke bedrijvengids-embed adresseert op slug). Zoekt,
// als routeParam géén UUID is en niet (meer) als companies.slug bestaat, of
// het een vroegere slug is (company_slug_aliases, 0162/0163) en geeft zo ja
// de HUIDIGE slug terug, voor een 308 naar de canonieke URL. Werkt voor
// zowel een ingelogde als een anonieme supabase-client (resolve_company_
// slug_alias heeft een anon-grant) — zelfde patroon als
// resolveActivitySlugAlias (lib/agenda/slug.ts), maar via een functie i.p.v.
// een rechtstreekse tabel-select, omdat hier ook de anonieme embed moet
// kunnen resolven.
export async function resolveCompanySlugAlias(
  supabase: SupabaseClient<Database>,
  routeParam: string
): Promise<string | null> {
  if (UUID_RE.test(routeParam)) return null;
  const { data } = await supabase.rpc("resolve_company_slug_alias", { p_slug: routeParam });
  return data ?? null;
}
