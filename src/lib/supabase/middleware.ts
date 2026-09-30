import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { Database } from "@/lib/types/database";
import { safeRedirectPath } from "@/lib/url/safeRedirect";
import { supabaseAnonKey, supabaseUrl } from "./env";
import { DEFAULT_MAX_AGE, REMEMBERED_MAX_AGE, REMEMBER_ME_COOKIE, VERIFIED_USER_ID_HEADER } from "./session-persistence";

// /embed: publieke, nav-loze pagina's bedoeld om als iframe op de externe
// VOC-website te draaien (agenda, aanmelden) — een écht uitgelogde bezoeker
// daar mag nooit tegen de inlogmuur aanlopen. Stond hier per ongeluk nog
// niet bij: werkte tot nu toe alleen "toevallig" zodra wie het testte zelf
// al op het portaal was ingelogd in dezelfde browser.
// /api/embed: publieke JSON-endpoints voor de embeds (agenda-status,
// bedrijfsdetail) — moeten hier ook expliciet bij staan, anders redirect
// deze middleware een anonieme bezoeker naar /login met een HTML-redirect
// i.p.v. gewoon door te laten (de routes zelf geven `profile: null`/publieke
// data terug). Zie proxy.ts voor waarom deze routes toch door de middleware
// moeten lopen i.p.v. er net als api/cron helemaal buiten te vallen.
const PUBLIC_PATHS = ["/login", "/register", "/auth", "/wachtwoord-vergeten", "/toegang-aanvragen", "/embed", "/api/embed"];

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
    // Zie dezelfde toelichting in supabase/server.ts.
    cookieOptions: { maxAge, httpOnly: true, secure: process.env.NODE_ENV === "production" },
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
    // ?next=... respecteren i.p.v. altijd hardcoded naar "/" — anders komt
    // een al-ingelogde bezoeker die via bv. de embed-agenda's "Log in om je
    // aan te melden"-link met ?next=/agenda/[id] hier belandt, alsnog op het
    // dashboard terecht i.p.v. bij de activiteit waar die vandaan kwam.
    const next = request.nextUrl.searchParams.get("next");
    return NextResponse.redirect(new URL(safeRedirectPath(next), request.url));
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
