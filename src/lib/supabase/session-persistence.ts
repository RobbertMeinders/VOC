// "Blijf ingelogd" on the login form. Presence of REMEMBER_ME_COOKIE decides
// how long the Supabase session cookies themselves are allowed to live —
// see server.ts and middleware.ts, the only two places that create a
// Supabase server client and therefore the only two places a cookie maxAge
// actually gets applied.
export const REMEMBER_ME_COOKIE = "voc-remember-me";
export const REMEMBERED_MAX_AGE = 60 * 60 * 24 * 365; // 12 maanden
export const DEFAULT_MAX_AGE = 60 * 60 * 24; // 1 dag

// Request header middleware sets to the already-verified user id, so
// getCurrentProfile() (session.ts) doesn't have to call auth.getUser()
// again — that call is a real network round-trip to Supabase Auth, and
// doing it twice (once in middleware, once per page render) roughly
// doubles auth latency on every single navigation. Always set or deleted
// by middleware based on its own auth.getUser() result — never trust this
// header from any other source.
export const VERIFIED_USER_ID_HEADER = "x-voc-verified-user-id";
