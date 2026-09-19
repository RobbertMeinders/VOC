// "Blijf ingelogd" on the login form. Presence of REMEMBER_ME_COOKIE decides
// how long the Supabase session cookies themselves are allowed to live —
// see server.ts and middleware.ts, the only two places that create a
// Supabase server client and therefore the only two places a cookie maxAge
// actually gets applied.
export const REMEMBER_ME_COOKIE = "voc-remember-me";
export const REMEMBERED_MAX_AGE = 60 * 60 * 24 * 90; // 90 dagen
export const DEFAULT_MAX_AGE = 60 * 60 * 24; // 1 dag
