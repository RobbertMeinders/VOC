"use client";

import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "@/lib/types/database";
import { supabaseAnonKey, supabaseUrl } from "./env";

// One client per browser tab. Safe to call repeatedly; @supabase/ssr caches
// nothing itself so callers should keep the instance in a module singleton.
let browserClient: ReturnType<typeof createBrowserClient<Database>> | undefined;

export function createClient() {
  if (!browserClient) {
    browserClient = createBrowserClient<Database>(supabaseUrl(), supabaseAnonKey());
  }
  return browserClient;
}
