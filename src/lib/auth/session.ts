import "server-only";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/types/database";

export type Profile = Database["public"]["Tables"]["profiles"]["Row"];

/**
 * Returns the signed-in member's profile row, or `null` when there is no
 * session. Prefer this over reading `auth.getUser()` directly — it also
 * carries the role and active flag every authorization check needs.
 */
export async function getCurrentProfile(): Promise<Profile | null> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single();

  return profile ?? null;
}

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
