import "server-only";

import { cache } from "react";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { VERIFIED_USER_ID_HEADER } from "@/lib/supabase/session-persistence";
import type { Database } from "@/lib/types/database";

export type Profile = Database["public"]["Tables"]["profiles"]["Row"];

/**
 * Returns the signed-in member's profile row, or `null` when there is no
 * session. Prefer this over reading `auth.getUser()` directly — it also
 * carries the role and active flag every authorization check needs.
 *
 * Wrapped in React's `cache()` because both the (app) layout and almost
 * every page call `requireProfile()` independently — without this, that's
 * an extra profiles select on every single navigation instead of one;
 * `cache()` dedupes repeat calls within the same request/render pass, same
 * as Next.js does automatically for `fetch()`.
 */
export const getCurrentProfile = cache(async (): Promise<Profile | null> => {
  const supabase = await createClient();

  // middleware.ts already called auth.getUser() for this exact request and
  // forwards the verified id via header — reuse it instead of paying for a
  // second round trip to Supabase's Auth server here. Falls back to calling
  // auth.getUser() directly for any render path middleware doesn't cover.
  let userId = (await headers()).get(VERIFIED_USER_ID_HEADER);
  if (!userId) {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    userId = user?.id ?? null;
  }

  if (!userId) return null;

  const { data: profile } = await supabase.from("profiles").select("*").eq("id", userId).single();

  return profile ?? null;
});

/**
 * Server Component / Server Action guard: redirects to /login when there is
 * no session, and to a "account gedeactiveerd" notice when the member's
 * account was deactivated by an admin.
 */
export async function requireProfile(): Promise<Profile> {
  const profile = await getCurrentProfile();

  if (!profile) {
    redirect("/login");
  }

  if (!profile.is_active) {
    redirect("/account-gedeactiveerd");
  }

  return profile;
}

/**
 * Guard for bestuurslid/beheerder-only Server Components and Actions.
 * Redirects members without board rights back to the home feed.
 */
export async function requireBoard(): Promise<Profile> {
  const profile = await requireProfile();

  if (profile.role !== "bestuurslid" && profile.role !== "beheerder") {
    redirect("/");
  }

  return profile;
}

/** Guard for beheerder-only Server Components and Actions. */
export async function requireAdmin(): Promise<Profile> {
  const profile = await requireProfile();

  if (profile.role !== "beheerder") {
    redirect("/");
  }

  return profile;
}
