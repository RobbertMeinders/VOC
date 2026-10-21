// Gedeelde variant van het patroon dat lib/supabase/env.ts al voor de
// publieke Supabase-variabelen gebruikt, nu voor de server-only secrets die
// cron-routes/e-mailverzending her en der los met hun eigen
// `if (!x) ...`-check lazen: een duidelijke foutmelding op het moment van
// gebruik i.p.v. een cryptische crash verderop (bv. een ongedefinieerde
// Authorization-header-vergelijking die altijd "true" uitvalt).
function requireEnv(name: string, value: string | undefined): string {
  if (!value) {
    throw new Error(`Ontbrekende environment variable "${name}".`);
  }
  return value;
}

export const cronSecret = () => requireEnv("CRON_SECRET", process.env.CRON_SECRET);
export const supabaseServiceRoleKey = () => requireEnv("SUPABASE_SERVICE_ROLE_KEY", process.env.SUPABASE_SERVICE_ROLE_KEY);
