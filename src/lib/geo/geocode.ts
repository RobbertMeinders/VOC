import "server-only";

// Gratis geocoding via OpenStreetMap's Nominatim (geen API-key nodig). Hun
// gebruiksvoorwaarden vragen max. 1 aanroep per seconde en een herkenbare
// User-Agent — ruim voldoende voor dit incidentele gebruik (alleen bij het
// opslaan van een bedrijfsadres door bestuur/beheer, niet bij elke
// paginaweergave).
const NOMINATIM_URL = "https://nominatim.openstreetmap.org/search";

type GeocodeSuccess = { latitude: number; longitude: number };
type GeocodeFailure = { reason: string };
type GeocodeAttempt = GeocodeSuccess | GeocodeFailure | { empty: true; reason: string };

async function attemptGeocode(url: string, description: string): Promise<GeocodeAttempt> {
  try {
    const response = await fetch(url, {
      headers: { "User-Agent": "VOC-Ledenportaal-PWA/1.0" },
    });
    if (!response.ok) {
      return { reason: `Nominatim gaf status ${response.status} voor "${description}"` };
    }

    const results = (await response.json()) as { lat: string; lon: string }[];
    const first = results[0];
    if (!first) {
      return { empty: true, reason: `geen resultaat van Nominatim voor "${description}"` };
    }

    const latitude = Number.parseFloat(first.lat);
    const longitude = Number.parseFloat(first.lon);
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      return { reason: `ongeldige coördinaten in Nominatim-resultaat voor "${description}"` };
    }

    return { latitude, longitude };
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : String(cause);
    return { reason: `aanroep naar Nominatim mislukt voor "${description}": ${message}` };
  }
}

// Variant die ook de mislukkingsreden teruggeeft — nodig om in de
// beheer-UI (regeocodeMissingCompaniesAction) te kunnen tonen wáárom
// Nominatim niets opleverde i.p.v. alleen "0 hersteld".
async function geocodeAddressDetailed(parts: {
  address?: string | null;
  postalCode?: string | null;
  city?: string | null;
}): Promise<GeocodeSuccess | GeocodeFailure> {
  if (!parts.address && !parts.city) return { reason: "geen adres opgegeven" };

  const description = [parts.address, parts.postalCode, parts.city].filter(Boolean).join(", ");

  // Eerste poging: gestructureerde velden (street/postalcode/city) i.p.v.
  // één vrije tekstregel — een bedrijf met alleen postcode + plaats (geen
  // straatadres) levert hiermee betrouwbaarder een resultaat op dan met
  // een samengevoegde tekstregel.
  const structuredParams = new URLSearchParams({ format: "json", limit: "1", countrycodes: "nl" });
  if (parts.address) structuredParams.set("street", parts.address);
  if (parts.postalCode) structuredParams.set("postalcode", parts.postalCode);
  if (parts.city) structuredParams.set("city", parts.city);
  const structuredResult = await attemptGeocode(`${NOMINATIM_URL}?${structuredParams.toString()}`, description);
  if (!("empty" in structuredResult)) return structuredResult;

  // Terugval: een vrije tekstregel. Nominatim's `city`-parameter verwacht
  // een officiële plaatsnaam (stad/dorp) — een klein gehucht zoals
  // "Kielwindeweer" matcht daar niet op, maar wordt door een vrije
  // tekstzoekopdracht (die fuzzy over alle adrescomponenten zoekt) vaak
  // wél gevonden. Zelfde 1,1s-pauze als tussen bedrijven onderling, om
  // Nominatims limiet van 1 aanroep/seconde niet te overschrijden.
  await new Promise((resolve) => setTimeout(resolve, 1100));
  const freeTextQuery = [parts.address, parts.postalCode, parts.city, "Nederland"].filter(Boolean).join(", ");
  const freeTextUrl = `${NOMINATIM_URL}?format=json&limit=1&countrycodes=nl&q=${encodeURIComponent(freeTextQuery)}`;
  const freeTextResult = await attemptGeocode(freeTextUrl, description);
  if ("empty" in freeTextResult) return { reason: freeTextResult.reason };
  return freeTextResult;
}

export async function geocodeAddress(parts: {
  address?: string | null;
  postalCode?: string | null;
  city?: string | null;
}): Promise<GeocodeSuccess | null> {
  const result = await geocodeAddressDetailed(parts);
  if ("reason" in result) {
    // Geocoding is best-effort: een bedrijf zonder coördinaten blijft
    // gewoon in de lijst staan, verschijnt alleen niet op de kaart.
    console.error(`[geocode] ${result.reason}`);
    return null;
  }
  return result;
}

export async function geocodeAddressWithReason(parts: {
  address?: string | null;
  postalCode?: string | null;
  city?: string | null;
}): Promise<{ coordinates: GeocodeSuccess | null; reason?: string }> {
  const result = await geocodeAddressDetailed(parts);
  if ("reason" in result) return { coordinates: null, reason: result.reason };
  return { coordinates: result };
}
