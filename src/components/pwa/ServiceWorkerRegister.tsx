"use client";

import { useEffect } from "react";

// Registers the service worker unconditionally (offline shell + app-shell
// caching), independent of the push-notification opt-in in
// lib/push/subscribe.ts — a browser only offers "add to home screen" once an
// active service worker + manifest are both present, and push permission is
// a separate, later choice a member might never make.
export function ServiceWorkerRegister() {
  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js").catch(() => {});
  }, []);

  return null;
}
