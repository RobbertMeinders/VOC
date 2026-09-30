"use client";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/types/database";
import { getRealtimeAuthTokenAction } from "./getAuthToken";

// Ruim vóór het verlopen van het access-token al verversen (die leven
// doorgaans ~1 uur) — een "onthoud mij"-sessie duurt tot 12 maanden, dus
// een lang openstaand tabblad heeft dit echt nodig, anders valt de
// Realtime-RLS-check na verloop van tijd stil terug op anoniem.
const REFRESH_MARGIN_MS = 5 * 60 * 1000;
const MIN_REFRESH_DELAY_MS = 30 * 1000;

/**
 * Authenticeert de Realtime-websocket van een browser-client los van de
 * (inmiddels httpOnly) sessiecookie, via een kortlevend, server-verstrekt
 * access-token — zie getAuthToken.ts. Roep dit aan vóórdat je een channel
 * abonneert. Geeft een cleanup-functie terug die de ververs-timer stopt.
 */
export function authenticateRealtime(supabase: SupabaseClient<Database>): () => void {
  let cancelled = false;
  let timer: ReturnType<typeof setTimeout> | undefined;

  async function refresh() {
    const token = await getRealtimeAuthTokenAction();
    if (cancelled || !token) return;

    await supabase.realtime.setAuth(token.accessToken);
    if (cancelled) return;

    const delay = Math.max(token.expiresAt * 1000 - Date.now() - REFRESH_MARGIN_MS, MIN_REFRESH_DELAY_MS);
    timer = setTimeout(refresh, delay);
  }

  refresh();

  return () => {
    cancelled = true;
    if (timer) clearTimeout(timer);
  };
}
