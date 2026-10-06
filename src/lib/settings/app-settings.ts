import "server-only";

import { cache } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/types/database";

export type AppSettings = {
  site_name: string;
  org_name: string;
  logo_url: string | null;
};

// Zelfde waarden als de kolom-defaults in 0072_app_settings.sql — terugval
// voor het geval de rij (nog) niet bestaat, zodat de app nooit breekt op
// een lege tabel en elke bestaande caller precies hetzelfde blijft zien als
// vóór deze instelling bestond.
export const APP_SETTINGS_DEFAULTS: AppSettings = {
  site_name: "VOC Ledenportaal",
  org_name: "Veendammer Ondernemers Compagnie",
  logo_url: null,
};

// Neemt een expliciete client i.p.v. zelf createClient() aan te roepen, zodat
// dit ook werkt vanuit de nieuwsbrief-verzending (die zowel met de sessie-
// gebonden client als — voor ingeplande campagnes — de service-role-client
// draait, zie src/lib/newsletter/send.ts).
export async function fetchAppSettings(supabase: SupabaseClient<Database>): Promise<AppSettings> {
  const { data } = await supabase.from("app_settings").select("site_name, org_name, logo_url").eq("id", true).maybeSingle();
  return data ?? APP_SETTINGS_DEFAULTS;
}

// De gangbare manier om dit vanuit een Server Component/Action op te halen
// — select-policy is publiek leesbaar (zie migratie), dus dit werkt ook op
// niet-ingelogde pagina's (bv. /login). cache() dedupet herhaalde aanroepen
// binnen dezelfde request, zelfde patroon als getCurrentProfile().
export const getAppSettings = cache(async (): Promise<AppSettings> => {
  const supabase = await createClient();
  return fetchAppSettings(supabase);
});
