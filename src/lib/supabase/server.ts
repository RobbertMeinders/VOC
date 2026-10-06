import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import type { Database } from "@/lib/types/database";
import { supabaseAnonKey, supabaseUrl } from "./env";
import { DEFAULT_MAX_AGE, REMEMBERED_MAX_AGE, REMEMBER_ME_COOKIE } from "./session-persistence";

/**
 * Supabase client for Server Components, Route Handlers and Server Actions.
 * Must be created fresh per request: it reads/writes the request's cookies.
 *
 * Calling `.setAll()` from a Server Component (not an Action/Route Handler)
 * throws in Next.js — that's expected and harmless here, because the
 * middleware (see middleware.ts) is what actually persists refreshed
 * session cookies back to the browser.
 */
export async function createClient() {
  const cookieStore = await cookies();
  const maxAge = cookieStore.get(REMEMBER_ME_COOKIE)?.value === "1" ? REMEMBERED_MAX_AGE : DEFAULT_MAX_AGE;

  return createServerClient<Database>(supabaseUrl(), supabaseAnonKey(), {
    // @supabase/ssr's eigen default is httpOnly: false — expliciet
    // overschreven, anders is het sessie-JWT via document.cookie leesbaar
    // voor elke JavaScript die op de pagina draait. De Realtime-
    // abonnementen in FeedList/useUnreadCount authenticeren zichzelf nu
    // los van deze cookie via authenticateRealtime() (src/lib/realtime),
    // dus dit breekt die niet langer.
    cookieOptions: { maxAge, httpOnly: true, secure: process.env.NODE_ENV === "production" },
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            // @supabase/ssr's applyServerStorage (cookies.js) negeert de
            // cookieOptions.maxAge die we aan createServerClient meegeven en
            // zet bij elke daadwerkelijke sessie-cookie-write zelf altijd
            // zijn eigen vaste 400-dagen-default — "onthoud mij" had
            // daardoor geen enkel effect op de echte cookie-levensduur.
            // value === "" is een bewuste verwijdering (uitloggen/PKCE-
            // opruiming, maxAge 0) — die laten we ongemoeid.
            cookieStore.set(name, value, value ? { ...options, maxAge } : options);
          }
        } catch {
          // Called from a Server Component — ignore, middleware refreshes instead.
        }
      },
    },
  });
}
