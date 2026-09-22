// Elke route die Next.js als @modal-overlay onderschept (zie de
// (.)-mappen onder src/app/(app)/@modal) — gebruikt door RouteOverlayPanel
// om te bepalen of een pathname-wijziging "binnen overlay-land" blijft
// (bv. na het aanmaken van een activiteit, /agenda/nieuw -> /agenda/[id])
// of echt een navigatie weg is, waarbij de overlay moet sluiten, en om de
// juiste "sluiten"-bestemming te bepalen. "nieuw"/"bewerken" staan bewust
// vóór het algemene /agenda/[id]-patroon, anders matcht dat eerst.
const OVERLAY_ROUTES: { pattern: RegExp; closeHref: (match: RegExpMatchArray) => string }[] = [
  { pattern: /^\/agenda\/([^/]+)\/bewerken$/, closeHref: (match) => `/agenda/${match[1]}` },
  { pattern: /^\/agenda\/nieuw$/, closeHref: () => "/agenda" },
  { pattern: /^\/agenda\/[^/]+$/, closeHref: () => "/agenda" },
  { pattern: /^\/bedrijven\/[^/]+$/, closeHref: () => "/bedrijven" },
  { pattern: /^\/leden\/[^/]+$/, closeHref: () => "/leden" },
  { pattern: /^\/beheer\/(agenda|bedrijven|documenten|leden)$/, closeHref: () => "/beheer" },
];

export function isOverlayRoute(pathname: string): boolean {
  return OVERLAY_ROUTES.some(({ pattern }) => pattern.test(pathname));
}

// Sluiten (kruisje/Esc) gaat naar een vaste bestemming i.p.v. router.back():
// met browser-history kon sluiten op een onverwachte plek uitkomen zodra je
// tussendoor ook via het menu/bottom-nav had genavigeerd (die history-entries
// tellen óók mee voor back()) — een vaste bestemming, berekend uit de huidige
// pathname, is voorspelbaar ongeacht hoe je er kwam.
export function getOverlayCloseHref(pathname: string): string | null {
  for (const { pattern, closeHref } of OVERLAY_ROUTES) {
    const match = pathname.match(pattern);
    if (match) return closeHref(match);
  }
  return null;
}
