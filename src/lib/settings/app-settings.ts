import "server-only";

import { cache } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { cachedQuery } from "@/lib/cache/queryCache";
import type { Database } from "@/lib/types/database";

// Gedeelde cross-request cache-sleutel — ook gebruikt door elke server action
// die app_settings wijzigt (zie beheer/instellingen/actions.ts) om de cache
// direct te verversen na een opslag.
export const APP_SETTINGS_CACHE_KEY = "app-settings";

export type AppSettings = {
  site_name: string;
  org_name: string;
  logo_url: string | null;
  privacy_content: string;
  show_testfase: boolean;
  signature_personal_name: string | null;
  signature_personal_role: string | null;
  signature_personal_phone: string | null;
  signature_personal_email: string | null;
};

// Zelfde waarden als de kolom-defaults in 0072_app_settings.sql — terugval
// voor het geval de rij (nog) niet bestaat, zodat de app nooit breekt op
// een lege tabel en elke bestaande caller precies hetzelfde blijft zien als
// vóór deze instelling bestond.
export const APP_SETTINGS_DEFAULTS: AppSettings = {
  site_name: "VOC Ledenportaal",
  org_name: "Veendammer Ondernemers Compagnie",
  logo_url: null,
  privacy_content: "",
  show_testfase: true,
  signature_personal_name: null,
  signature_personal_role: null,
  signature_personal_phone: null,
  signature_personal_email: null,
};

// Neemt een expliciete client i.p.v. zelf createClient() aan te roepen, zodat
// dit ook werkt vanuit de nieuwsbrief-verzending (die zowel met de sessie-
// gebonden client als — voor ingeplande campagnes — de service-role-client
// draait, zie src/lib/newsletter/send.ts).
export async function fetchAppSettings(supabase: SupabaseClient<Database>): Promise<AppSettings> {
  const { data, error } = await supabase
    .from("app_settings")
    .select(
      "site_name, org_name, logo_url, privacy_content, show_testfase, signature_personal_name, signature_personal_role, signature_personal_phone, signature_personal_email"
    )
    .eq("id", true)
    .maybeSingle();

  if (!error) return data ?? APP_SETTINGS_DEFAULTS;

  // Migratie 0129 (signature_personal_*-kolommen) nog niet uitgevoerd op deze
  // database: de select hierboven faalt dan in zijn geheel, en zonder deze
  // terugval viel de HELE instelling (incl. site_name/privacy_content) stil
  // terug op APP_SETTINGS_DEFAULTS — dat maakte o.a. Privacy & veiligheid
  // sitebreed leeg lijken, ook al stond er gewoon tekst in de database.
  const { data: baseData } = await supabase
    .from("app_settings")
    .select("site_name, org_name, logo_url, privacy_content, show_testfase")
    .eq("id", true)
    .maybeSingle();
  if (!baseData) return APP_SETTINGS_DEFAULTS;
  return {
    ...baseData,
    signature_personal_name: null,
    signature_personal_role: null,
    signature_personal_phone: null,
    signature_personal_email: null,
  };
}

// De gangbare manier om dit vanuit een Server Component/Action op te halen
// — select-policy is publiek leesbaar (zie migratie), dus dit werkt ook op
// niet-ingelogde pagina's (bv. /login). cache() dedupet herhaalde aanroepen
// binnen dezelfde request; cachedQuery() deelt het resultaat daarnaast ook
// tussen requests/instances (5 min, zelfde als andere gedeelde paginadata) —
// deze instelling verandert zelden en is voor elke bezoeker identiek (geen
// per-gebruiker variatie in de RLS-policy), dus is bij uitstek geschikt om
// te delen i.p.v. bij elke request opnieuw op te halen. createClient() mag
// niet binnen de cachedQuery-closure (cookies/headers) — vandaar vóór de
// aanroep gebouwd en alleen via closure gebruikt, zelfde patroon als elke
// andere cachedQuery-aanroeper.
export const getAppSettings = cache(async (): Promise<AppSettings> => {
  const supabase = await createClient();
  return cachedQuery(APP_SETTINGS_CACHE_KEY, 300_000, () => fetchAppSettings(supabase));
});
