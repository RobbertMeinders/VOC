import type { NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function proxy(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for:
     * - _next/static, _next/image (Next.js internals)
     * - the actual static assets this app serves: the PWA manifest/service
     *   worker, the two Next.js-convention icon routes (app/icon.png,
     *   app/apple-icon.png), favicon.ico, and the /icons and /brand folders
     *   (manifest icons, social/logo assets from public/). Listed by their
     *   exact, known path — never by "ends in an image extension": that
     *   used to also exclude dynamic routes like /leden/[id] whenever the
     *   id happened to end in .png/.svg/etc. (e.g. /leden/x.png), which skips
     *   this middleware entirely and meant the x-voc-verified-user-id header
     *   below went unverified on those requests — a client could set it
     *   directly and impersonate any profile id. Same bug class as the
     *   api/embed incident this file already documents below; fixed the
     *   same way, by narrowing the exclusion to only real static paths.
     * - api/cron/* — Vercel Cron hits these with its own CRON_SECRET
     *   bearer header, never a Supabase session cookie. Without this
     *   exclusion, `!user` sends every cron request into the login
     *   redirect below before the route handler's own secret check ever
     *   runs — silently breaking the scheduled reminder/push jobs.
     * - api/notifications/click — hit by the service worker (sw.js) on a
     *   notificationclick, which never carries a Supabase session cookie
     *   either; the route itself derives the profile from the
     *   notification id server-side, so no auth is needed or expected here.
     * - api/webhooks/* — reserved for routes hit by external services with
     *   their own signature-based auth, never a Supabase session cookie.
     *
     * api/embed/* is DELIBERATELY NOT excluded here (unlike the paths
     * above): those routes call getCurrentProfile(), which trusts the
     * x-voc-verified-user-id header as already-verified — a guarantee that
     * only holds because this middleware is the one thing that sets/clears
     * it based on a real auth.getUser() call. Excluding api/embed from the
     * matcher used to mean that header was never touched for those routes,
     * so a client could set it directly on the request and impersonate any
     * profile id (IDOR). api/embed is listed in PUBLIC_PATHS (middleware.ts)
     * instead, so it still never gets redirected to /login for an
     * anonymous visitor, while the header keeps getting verified.
     */
    "/((?!_next/static|_next/image|manifest.webmanifest|sw.js|favicon.ico|icon.png|apple-icon.png|icons/|brand/|api/cron|api/notifications/click|api/webhooks).*)",
  ],
};
