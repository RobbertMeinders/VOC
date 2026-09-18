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
     */
    "/((?!_next/static|_next/image|manifest.webmanifest|sw.js|.*\\.(?:svg|png|jpg|jpeg|webp|gif|ico)$).*)",
  ],
};
