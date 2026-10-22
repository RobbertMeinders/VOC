import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/types/database";

// Activiteiten hebben al een leesbare, unieke `slug`-kolom (bv.
// "open-borrel" i.p.v. een kale uuid) — zie agenda/actions.ts'
// generateUniqueSlug en migratie 0049_activity_slug.sql (backfilled voor
// elke bestaande rij, dus gegarandeerd aanwezig). Tot nu toe werd die kolom
// alleen gebruikt voor de #-ankers van de openbare agenda-embed; hier
// hetzelfde hergebruikt voor de URL's in het portaal zelf.
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const NL_TIMEZONE = "Europe/Amsterdam";

// Terugval op `id` als `slug` onverwacht ontbreekt (bv. een query die de
// kolom niet heeft geselecteerd) — anders bouwt dit stilzwijgend
// `/agenda/undefined` i.p.v. een werkende link. `id` is optioneel: op de
// meeste plekken staat de slug al vast (bv. na een eigen slug-opzoeking) en
// is er geen losse id bij de hand.
export function activityHref(activity: { slug: string; id?: string }, suffix = ""): string {
  return `/agenda/${activity.slug ?? activity.id}${suffix}`;
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

function slugifyPart(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

// URL-ronde #100: i.t.t. de (bewust stabiele) leden-/bedrijven-slug bevat
// de activiteiten-slug ook de Nederlandse maand + het jaar van starts_at
// (bv. "nieuwjaarsborrel-januari-2026") — dat maakt een losse link meteen
// herkenbaar, en voorkomt dat een jaarlijks terugkerende activiteit met
// dezelfde titel ("Nieuwjaarsborrel" in 2025 én 2026) alleen via een kale
// "-2"-staart van elkaar te onderscheiden is. Omdat deze basis van zowel de
// titel als de datum afhangt, wijzigt de slug mee zodra een van beide
// verandert (zie updateActivityAction) — activity_slug_aliases (migratie
// 0154) houdt de oude slug dan aan, zodat een al gedeelde link via een 308
// naar de nieuwe blijft wijzen i.p.v. te breken.
export function activitySlugBase(title: string, startsAtIso: string): string {
  const monthYear = new Intl.DateTimeFormat("nl-NL", { timeZone: NL_TIMEZONE, month: "long", year: "numeric" }).format(
    new Date(startsAtIso)
  );
  return slugifyPart(`${title} ${monthYear}`);
}

// Zoekt, als routeParam géén UUID is en niet (meer) als activities.slug
// bestaat, of het een vroegere slug van een inmiddels hernoemde/verzette
// activiteit is (activity_slug_aliases, migratie 0154) — en geeft zo ja de
// HUIDIGE slug van die activiteit terug, voor een 308 naar de canonieke
// URL. Geeft null terug als er ook daar niets bij past (echt onbestaand).
export async function resolveActivitySlugAlias(
  supabase: SupabaseClient<Database>,
  routeParam: string
): Promise<string | null> {
  if (UUID_RE.test(routeParam)) return null;
  const { data } = await supabase
    .from("activity_slug_aliases")
    .select("activity:activities(slug)")
    .eq("slug", routeParam)
    .maybeSingle<{ activity: { slug: string } | null }>();
  return data?.activity?.slug ?? null;
}
