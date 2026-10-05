// Geen "server-only" hier: puur stringwerk, zonder server-geheimen — zowel
// server-side e-mailrendering (send.ts) als de client-side nieuwsbriefpreview
// (die exact dezelfde HTML moet tonen als wat verstuurd wordt) gebruiken 'm.
export function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
