"use server";

import { getCurrentProfile } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

export type RealtimeAuthToken = { accessToken: string; expiresAt: number };

/**
 * Geeft alleen het kortlevende access-token van de huidige sessie terug
 * (nooit het refresh-token) — bedoeld om de browser-client's Realtime-
 * websocket te authenticeren via `supabase.realtime.setAuth()`, zodat de
 * postgres_changes-RLS-check (`auth.uid()`) blijft werken ook nu de
 * sessiecookie zelf `httpOnly` is en dus niet meer door clientcode te lezen
 * is. `null` (geen redirect) als er geen sessie is — de aanroepende
 * component slaat live-updates dan gewoon over i.p.v. te crashen.
 */
export async function getRealtimeAuthTokenAction(): Promise<RealtimeAuthToken | null> {
  const profile = await getCurrentProfile();
  if (!profile) return null;

  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) return null;

  return { accessToken: session.access_token, expiresAt: session.expires_at ?? 0 };
}
