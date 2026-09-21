"use client";

import { useEffect } from "react";

/**
 * Freezes background scroll while a full-screen overlay is open — without
 * this, iOS Safari can still scroll the page behind a `fixed inset-0` modal
 * on touchmove. The four shared nav overlays (search/notificaties/netwerk/
 * account) get this via OverlayContext already; one-off modals (likers,
 * aanwezigenlijst, documentvoorbeeld, nieuw-bericht) use this hook instead.
 */
export function useBodyScrollLock(active: boolean) {
  useEffect(() => {
    if (!active) return;
    const original = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = original;
    };
  }, [active]);
}
