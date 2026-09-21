import "server-only";

import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/types/database";

/**
 * A service_role client, for the handful of operations that genuinely need
 * one (currently: auth.admin.generateLink for our own-templated password
 * reset e-mail). This bypasses RLS entirely — never use it for anything a
 * regular authenticated/RLS-scoped client can do instead, and never import
 * this module into a Client Component ("server-only" makes that a build
 * error, but keep it that way deliberately).
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY ontbreekt in de environment variables.");
  }

  return createSupabaseClient<Database>(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
