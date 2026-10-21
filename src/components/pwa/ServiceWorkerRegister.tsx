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
    // ?v=<versie>: de service worker leest dit uit zijn eigen URL om
    // CACHE_NAME per release te laten verschillen (zie sw.js) — zonder dit
    // query-param detecteert de browser een ongewijzigde /sw.js tussen twee
    // releases met alleen contentwijzigingen elders, en blijft de oude cache
    // (met het toen gecachte /offline-bestand) voor onbepaalde tijd staan.
    navigator.serviceWorker.register(`/sw.js?v=${process.env.NEXT_PUBLIC_APP_VERSION}`).catch(() => {});
  }, []);

  return null;
}
