// Minimal push-notification service worker. It intentionally does nothing
// else (no offline caching) — that's Fase 8's job.

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
    data: { link: payload.link || "/" },
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const link = event.notification.data?.link || "/";

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
