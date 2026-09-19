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
    cookieOptions: { maxAge },
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // Called from a Server Component — ignore, middleware refreshes instead.
        }
      },
    },
  });
}
