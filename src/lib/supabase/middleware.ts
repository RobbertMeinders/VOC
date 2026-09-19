import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { Database } from "@/lib/types/database";
import { supabaseAnonKey, supabaseUrl } from "./env";
import { DEFAULT_MAX_AGE, REMEMBERED_MAX_AGE, REMEMBER_ME_COOKIE } from "./session-persistence";

const PUBLIC_PATHS = ["/login", "/register", "/auth", "/wachtwoord-vergeten", "/toegang-aanvragen"];

function isPublicPath(pathname: string) {
  return PUBLIC_PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`));
}

/**
 * Refreshes the Supabase session cookie on every request and redirects
 * unauthenticated visitors away from protected routes. This is the only
 * place session cookies are reliably persisted (Server Components can't
 * write cookies), so keep it wired into middleware.ts.
 */
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });
  const maxAge = request.cookies.get(REMEMBER_ME_COOKIE)?.value === "1" ? REMEMBERED_MAX_AGE : DEFAULT_MAX_AGE;

  const supabase = createServerClient<Database>(supabaseUrl(), supabaseAnonKey(), {
    cookieOptions: { maxAge },
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        for (const { name, value } of cookiesToSet) {
          request.cookies.set(name, value);
        }
        response = NextResponse.next({ request });
        for (const { name, value, options } of cookiesToSet) {
          response.cookies.set(name, value, options);
        }
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  if (!user && !isPublicPath(pathname)) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (user && pathname === "/login") {
    return NextResponse.redirect(new URL("/", request.url));
  }

  return response;
}
