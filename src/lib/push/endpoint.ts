// M15 (beveiligingsfixlijst Blok 3): subscribeToPushAction slaat een door de
// client meegegeven endpoint-URL op, die de pushverzend-cron later zelf
// (server-side, zonder verdere controle) met webpush.sendNotification()
// aanroept — een willekeurige/interne URL hier zou de server dus een
// aanvraag naar eigen keuze laten doen (SSRF). Een echte pushsubscriptie
// komt altijd van de eigen pushdienst van de browser; dit beperkt endpoints
// tot https en een vaste lijst bekende pushdienst-hosts.
const ALLOWED_PUSH_ENDPOINT_HOSTS = [
  /^fcm\.googleapis\.com$/, // Chrome, Edge, en de meeste Chromium-browsers
  /^updates\.push\.services\.mozilla\.com$/, // Firefox
  /^web\.push\.apple\.com$/, // Safari (vanaf 16.4)
  /\.notify\.windows\.com$/, // (legacy) Windows/WNS
];

export function isAllowedPushEndpoint(endpoint: string): boolean {
  let url: URL;
  try {
    url = new URL(endpoint);
  } catch {
    return false;
  }
  if (url.protocol !== "https:") return false;
  return ALLOWED_PUSH_ENDPOINT_HOSTS.some((pattern) => pattern.test(url.hostname));
}
