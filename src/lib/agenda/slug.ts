// Activiteiten hebben al een leesbare, unieke `slug`-kolom (bv.
// "open-borrel" i.p.v. een kale uuid) — zie agenda/actions.ts'
// generateUniqueSlug en migratie 0049_activity_slug.sql (backfilled voor
// elke bestaande rij, dus gegarandeerd aanwezig). Tot nu toe werd die kolom
// alleen gebruikt voor de #-ankers van de openbare agenda-embed; hier
// hetzelfde hergebruikt voor de URL's in het portaal zelf.
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function activityHref(activity: { slug: string }, suffix = ""): string {
  return `/agenda/${activity.slug}${suffix}`;
}

// Oude, rechtstreeks verstuurde links (kaal UUID, bv. in eerder verstuurde
// e-mails) blijven gewoon werken: een route-param is óf zelf al een
// volledig UUID, óf de slug zelf. Geeft een [column, operator, value]-triple
// terug voor supabase-js' .filter(), zodat aanroepers niet zelf met twee
// losse soorten query-opbouw hoeven te werken — en nooit per ongeluk
// "id = <niet-uuid-tekst>" uitvoeren (dat laat Postgres zelf al klappen op
// het type, nog vóór er een rij vergeleken wordt).
export function activityIdFilter(param: string): [string, string, string] {
  return UUID_RE.test(param) ? ["id", "eq", param] : ["slug", "eq", param];
}
