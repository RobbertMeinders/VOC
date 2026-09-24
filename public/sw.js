// Push notifications (Fase 5) plus a minimal offline shell (Fase 8). The app
// itself needs a live Supabase connection for basically everything, so there's
// no point trying to cache real data — this only makes sure the app installs
// as a PWA cleanly and shows something better than the browser's own "no
// internet" page when a navigation fails offline.

const CACHE_NAME = "voc-shell-v1";
const OFFLINE_URL = "/offline";
const PRECACHE_URLS = [OFFLINE_URL, "/icons/icon-192.png", "/icons/icon-512.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  // Navigations (clicking a link, typing a URL): try the network first —
  // this is a live app, cached HTML would show stale/wrong auth state — and
  // only fall back to the offline page when there's genuinely no network.
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request).catch(() => caches.match(OFFLINE_URL).then((cached) => cached ?? Response.error()))
    );
    return;
  }

  // Next's content-hashed static assets never change under the same URL, so
  // cache-first is safe and skips the network entirely on repeat visits.
  const url = new URL(request.url);
  if (url.origin === self.location.origin && url.pathname.startsWith("/_next/static/")) {
    event.respondWith(
      caches.match(request).then(
        (cached) =>
          cached ??
          fetch(request).then((response) => {
            const copy = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
            return response;
          })
      )
    );
  }
});

self.addEventListener("push", (event) => {
  if (!event.data) return;

  let payload;
  try {
    payload = event.data.json();
  } catch {
    payload = { title: "VOC Ledenportaal", body: event.data.text() };
  }

  const title = payload.title || "VOC Ledenportaal";
  const options = {
    body: payload.body || "",
    icon: "/icon.png",
    badge: "/icon.png",
    data: { link: payload.link || "/", notificationId: payload.notification_id || null },
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const link = event.notification.data?.link || "/";
  const notificationId = event.notification.data?.notificationId;

  // Los, best-effort — het profiel wordt server-side afgeleid uit de
  // notificatie-id zelf (log_notification_click), dus dit hoeft de
  // focus/openWindow hieronder niet te blokkeren of te laten falen.
  if (notificationId) {
    fetch("/api/notifications/click", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ notification_id: notificationId }),
    }).catch(() => {});
  }

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if (client.url.endsWith(link) && "focus" in client) {
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(link);
      }
    })
  );
});
