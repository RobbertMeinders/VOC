// Elke route die Next.js als @modal-overlay onderschept (zie de
// (.)-mappen onder src/app/(app)/@modal) — gebruikt door RouteOverlayPanel
// om te bepalen of een pathname-wijziging "binnen overlay-land" blijft
// (bv. na het aanmaken van een activiteit, /agenda/nieuw -> /agenda/[id])
// of echt een navigatie weg is, waarbij de overlay moet sluiten.
const OVERLAY_ROUTE_PATTERNS = [
  /^\/agenda\/[^/]+\/bewerken$/,
  /^\/agenda\/[^/]+$/,
  /^\/agenda\/nieuw$/,
  /^\/bedrijven\/[^/]+$/,
  /^\/leden\/[^/]+$/,
  /^\/beheer\/(agenda|bedrijven|documenten|leden)$/,
];

export function isOverlayRoute(pathname: string): boolean {
  return OVERLAY_ROUTE_PATTERNS.some((pattern) => pattern.test(pathname));
}
