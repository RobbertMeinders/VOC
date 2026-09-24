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
     */
    "/((?!_next/static|_next/image|manifest.webmanifest|sw.js|api/cron|api/notifications/click|.*\\.(?:svg|png|jpg|jpeg|webp|gif|ico)$).*)",
  ],
};
