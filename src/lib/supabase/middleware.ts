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
// /afmelden: de afmeldlink in elke verzonden nieuwsbrief/e-mailnotificatie
// — een bezoeker die daarop klikt, is zo goed als altijd uitgelogd (die
// klikt vanuit de eigen mailclient), en liep zonder deze regel eerst tegen
// de inlogmuur aan i.p.v. de afmeldbevestiging te zien. /offline: de PWA's
// eigen offline-terugvalpagina (manifest/service worker) — moet juist
// laden zónder netwerk/sessie, anders faalt de terugval zelf ook.
const PUBLIC_PATHS = [
  "/login",
  "/register",
  "/auth",
  "/wachtwoord-vergeten",
  "/toegang-aanvragen",
  "/embed",
  "/api/embed",
  "/afmelden",
  "/voorkeuren",
  "/opzegging-bevestigen",
  "/offline",
];

function isPublicPath(pathname: string) {
  return PUBLIC_PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`));
}

// Zelfde uitzondering als X-Frame-Options hieronder in next.config.ts: /embed
// en /api/embed zijn bewust wél iframe-baar (ingebed op de publieke
// WordPress-site), de rest van de app nooit.
function isEmbedPath(pathname: string) {
  return pathname === "/embed" || pathname.startsWith("/embed/") || pathname === "/api/embed" || pathname.startsWith("/api/embed/");
}

/**
 * Refreshes the Supabase session cookie on every request and redirects
 * unauthenticated visitors away from protected routes. This is the only
 * place session cookies are reliably persisted (Server Components can't
 * write cookies), so keep it wired into middleware.ts.
 */
// Content-Security-Policy, nonce-based per Next.js' eigen aanbevolen patroon
// (https://nextjs.org/docs/app/guides/content-security-policy): de nonce
// wordt hier per request gegenereerd en zowel op het request (zodat Next's
// eigen server-render 'm kan gebruiken voor de scripts die het zelf
// injecteert) als op de response (zodat de browser 'm afdwingt) gezet.
// style-src blijft 'unsafe-inline' toestaan — React's talloze dynamische
// `style={{...}}`-attributen (transities, berekende kleuren) hebben geen
// praktisch bruikbaar nonce-mechanisme, en CSS-injectie alleen (zonder
// script-uitvoering, die wél strikt is afgedwongen) is een veel kleiner
// risico. img-src/connect-src dekken exact de externe origins die de app
// daadwerkelijk laadt: Supabase Storage/Realtime, OpenStreetMap-tiles
// (bedrijvenkaart) en unpkg.com (Leaflet's eigen marker-iconen). CARTO's
// gedempte basemaps (kort geprobeerd in de afwerkronde) bleken een API-key
// te vereisen — teruggedraaid naar de gratis, geen-key-nodig OSM-tegels.
function buildCsp(nonce: string, embed: boolean): string {
  return [
    `default-src 'self'`,
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'`,
    `style-src 'self' 'unsafe-inline'`,
    `img-src 'self' data: blob: https://*.supabase.co https://*.tile.openstreetmap.org https://unpkg.com`,
    `font-src 'self' data:`,
    `connect-src 'self' https://*.supabase.co wss://*.supabase.co`,
    `base-uri 'self'`,
    `form-action 'self'`,
    `object-src 'none'`,
    // Zonder expliciete worker-src valt een service-worker-registratie terug
    // op child-src/default-src in sommige browsers, maar niet betrouwbaar in
    // alle — een strikte CSP zonder dit kan de PWA's service worker (push,
    // offline-cache) stilletjes laten blokkeren. manifest-src dekt het
    // webmanifest (installeerbaarheid/PWA-metadata) op dezelfde manier.
    `worker-src 'self'`,
    `manifest-src 'self'`,
    // VOC-16: CSP-eigen (modernere) tegenhanger van de X-Frame-Options-header
    // in next.config.ts — defense-in-depth, X-Frame-Options: DENY blokkeerde
    // hier al wel framen op elk ander pad. /embed en /api/embed zijn bewust
    // wél iframe-baar (de publieke WordPress-site van de VOC zelf, zie
    // beheer/embed-codes), en die hostname staat nergens vast in de app —
    // dus net als X-Frame-Options daar helemaal weglaten, geen restrictie.
    embed ? `frame-ancestors *` : `frame-ancestors 'self'`,
  ].join("; ");
}

export async function updateSession(request: NextRequest) {
  const maxAge = request.cookies.get(REMEMBER_ME_COOKIE)?.value === "1" ? REMEMBERED_MAX_AGE : DEFAULT_MAX_AGE;
  let pendingCookies: { name: string; value: string; options: CookieOptions }[] = [];
  const nonce = crypto.randomUUID();
  const csp = buildCsp(nonce, isEmbedPath(request.nextUrl.pathname));

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
  // x-nonce: layout.tsx leest dit via headers() en zet het op het ene
  // inline <script>-tag dat de app zelf rendert (het thema-init-script).
  // Next.js herkent dezelfde nonce automatisch in de Content-Security-
  // Policy-header hieronder en past 'm zelf toe op de scripts die het
  // tijdens het renderen injecteert.
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("Content-Security-Policy", csp);

  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set("Content-Security-Policy", csp);
  for (const { name, value, options } of pendingCookies) {
    // Zie dezelfde toelichting in supabase/server.ts: @supabase/ssr zet bij
    // elke daadwerkelijke sessie-cookie-write zelf altijd zijn eigen vaste
    // 400-dagen-default, los van cookieOptions.maxAge — hier dus ook
    // overschrijven. value === "" is een bewuste verwijdering.
    response.cookies.set(name, value, value ? { ...options, maxAge } : options);
  }
  return response;
}
