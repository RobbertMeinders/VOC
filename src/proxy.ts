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
     * - static assets and the PWA manifest/service worker
     * - api/cron/* — Vercel Cron hits these with its own CRON_SECRET
     *   bearer header, never a Supabase session cookie. Without this
     *   exclusion, `!user` sends every cron request into the login
     *   redirect below before the route handler's own secret check ever
     *   runs — silently breaking the scheduled reminder/push jobs.
     * - api/notifications/click — hit by the service worker (sw.js) on a
     *   notificationclick, which never carries a Supabase session cookie
     *   either; the route itself derives the profile from the
     *   notification id server-side, so no auth is needed or expected here.
     * - api/webhooks/* — hit by external services (Resend) with their own
     *   signature-based auth (Svix), never a Supabase session cookie.
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
    "/((?!_next/static|_next/image|manifest.webmanifest|sw.js|api/cron|api/notifications/click|api/webhooks|.*\\.(?:svg|png|jpg|jpeg|webp|gif|ico)$).*)",
  ],
};
