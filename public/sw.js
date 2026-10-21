// Push notifications (Fase 5) plus a minimal offline shell (Fase 8). The app
// itself needs a live Supabase connection for basically everything, so there's
// no point trying to cache real data — this only makes sure the app installs
// as a PWA cleanly and shows something better than the browser's own "no
// internet" page when a navigation fails offline.

// Registratie geeft dit bestand een ?v=<package.json-versie>-querystring mee
// (zie ServiceWorkerRegister.tsx/push/subscribe.ts, die allebei dezelfde
// NEXT_PUBLIC_APP_VERSION build-time env-variabele gebruiken als de
// zichtbare versieregel in de sidebar) — zonder dat bleef CACHE_NAME een
// vaste letterlijke string over elke deploy heen, dus purgete `activate`
// hieronder nooit een oudere cache (met het toen gecachte /offline-bestand)
// tenzij iemand die string handmatig ophoogde bij elke release.
const CACHE_NAME = `voc-shell-${new URL(self.location.href).searchParams.get("v") ?? "v1"}`;
const OFFLINE_URL = "/offline";
// voc-logo-mark.png: het merkbeeld dat de offline-pagina zelf toont (Logo-
// component) — een vast, niet-contentgehasht pad in /public, dus hier
// rechtstreeks te precachen i.t.t. Next's gehashte build-output.
const PRECACHE_URLS = [OFFLINE_URL, "/icons/icon-192.png", "/icons/icon-512.png", "/brand/voc-logo-mark.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then(async (cache) => {
        await cache.addAll(PRECACHE_URLS);
        // De offline-pagina leunt verder op Next's content-gehashte
        // stylesheet (onbekende bestandsnaam vooraf, verandert elke build) —
        // zonder die ook te cachen toonde de offline-pagina wel tekst, maar
        // volledig ongestyled zodra iemand offline gaat vóór 'm ooit eerder
        // (met netwerk) bezocht te hebben. Haalt de net gecachte HTML op en
        // cachet elke <link rel="stylesheet">-href die 'm zelf aanhaalt.
        const offlinePage = await cache.match(OFFLINE_URL);
        const html = offlinePage ? await offlinePage.text() : "";
        const stylesheetHrefs = [...html.matchAll(/<link[^>]+rel="stylesheet"[^>]+href="([^"]+)"/g)].map((m) => m[1]);
        await Promise.all(stylesheetHrefs.map((href) => cache.add(href).catch(() => {})));
      })
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
    // Zonder tag stapelden meerdere snel opeenvolgende meldingen van
    // hetzelfde type (bv. een reeks reacties) zich op in het
    // systeemmeldingencentrum i.p.v. elkaar te vervangen.
    tag: payload.type || undefined,
    data: { link: payload.link || "/", notificationId: payload.notification_id || null },
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

// Een browser kan een pushabonnement periodiek laten verlopen/roteren (bv.
// na verloop van tijd of een browser-update) en vuurt dan dit event — zonder
// handler bleef het OUDE, nu ongeldige abonnement in de database staan en
// "sleten" pushmeldingen voor dat lid geruisloos weg zonder dat iemand het
// doorhad. sw.js (statisch uit /public, niet door Next's build verwerkt)
// heeft geen toegang tot de NEXT_PUBLIC_VAPID_PUBLIC_KEY env-variabele, dus
// hergebruikt hier bewust event.oldSubscription's eigen applicationServerKey
// i.p.v. een nieuwe sleutel te construeren — zonder oldSubscription kan dit
// niet veilig opnieuw abonneren, dan wordt dit best-effort overgeslagen.
// Stuurt het nieuwe abonnement naar /api/push/resubscribe: een server action
// kan een service worker niet rechtstreeks aanroepen.
self.addEventListener("pushsubscriptionchange", (event) => {
  const applicationServerKey = event.oldSubscription?.options?.applicationServerKey;
  if (!applicationServerKey) return;

  event.waitUntil(
    self.registration.pushManager
      .subscribe({ applicationServerKey, userVisibleOnly: true })
      .then((subscription) =>
        fetch("/api/push/resubscribe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(subscription.toJSON()),
        })
      )
      .catch(() => {})
  );
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
