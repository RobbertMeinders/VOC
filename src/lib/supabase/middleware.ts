import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { Database } from "@/lib/types/database";
import { supabaseAnonKey, supabaseUrl } from "./env";
import { DEFAULT_MAX_AGE, REMEMBERED_MAX_AGE, REMEMBER_ME_COOKIE, VERIFIED_USER_ID_HEADER } from "./session-persistence";

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
  const maxAge = request.cookies.get(REMEMBER_ME_COOKIE)?.value === "1" ? REMEMBERED_MAX_AGE : DEFAULT_MAX_AGE;
  let pendingCookies: { name: string; value: string; options: CookieOptions }[] = [];

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
        pendingCookies = cookiesToSet;
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

  // Forward the user id we just verified with Supabase Auth to the actual
  // render via a request header, so getCurrentProfile() (session.ts) can
  // skip calling auth.getUser() a second time — that call is a real network
  // round trip to Supabase's Auth server, and paying it twice (here, then
  // again per page render) roughly doubles auth latency on every
  // navigation. Always overwritten here based on our own verified `user`,
  // so a client can never forge it by sending the header itself.
  const requestHeaders = new Headers(request.headers);
  if (user) {
    requestHeaders.set(VERIFIED_USER_ID_HEADER, user.id);
  } else {
    requestHeaders.delete(VERIFIED_USER_ID_HEADER);
  }

  const response = NextResponse.next({ request: { headers: requestHeaders } });
  for (const { name, value, options } of pendingCookies) {
    response.cookies.set(name, value, options);
  }
  return response;
}
