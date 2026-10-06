import "server-only";

// Gratis geocoding via OpenStreetMap's Nominatim (geen API-key nodig). Hun
// gebruiksvoorwaarden vragen max. 1 aanroep per seconde en een herkenbare
// User-Agent — ruim voldoende voor dit incidentele gebruik (alleen bij het
// opslaan van een bedrijfsadres door bestuur/beheer, niet bij elke
// paginaweergave).
const NOMINATIM_URL = "https://nominatim.openstreetmap.org/search";

type GeocodeSuccess = { latitude: number; longitude: number };
type GeocodeFailure = { reason: string };
type GeocodeAttempt = GeocodeSuccess | { empty: true; reason: string } | GeocodeFailure;

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

function structuredUrl(parts: { address?: string | null; postalCode?: string | null; city?: string | null }) {
  const params = new URLSearchParams({ format: "json", limit: "1", countrycodes: "nl" });
  if (parts.address) params.set("street", parts.address);
  if (parts.postalCode) params.set("postalcode", parts.postalCode);
  if (parts.city) params.set("city", parts.city);
  return `${NOMINATIM_URL}?${params.toString()}`;
}

function freeTextUrl(parts: { address?: string | null; postalCode?: string | null; city?: string | null }) {
  const query = [parts.address, parts.postalCode, parts.city, "Nederland"].filter(Boolean).join(", ");
  return `${NOMINATIM_URL}?format=json&limit=1&countrycodes=nl&q=${encodeURIComponent(query)}`;
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

  // Poging 1: gestructureerd, zónder de plaatsnaam, als er een postcode
  // is — de postcode is op zichzelf al nauwkeurig genoeg, en een klein
  // gehucht (bv. "Kielwindeweer") dat Nominatim niet als officiële
  // plaatsnaam kent, laat de hele structured-query anders mislukken.
  // Poging 2: gestructureerd mét plaatsnaam (dekt het geval zonder
  // postcode). Poging 3: de oude vrije tekstregel als laatste terugval,
  // voor adressen die om een andere reden niet structured matchen.
  const attempts: string[] = [];
  if (parts.postalCode) attempts.push(structuredUrl({ address: parts.address, postalCode: parts.postalCode }));
  attempts.push(structuredUrl(parts));
  attempts.push(freeTextUrl(parts));

  let lastReason = `geen resultaat van Nominatim voor "${description}"`;
  for (const [index, url] of attempts.entries()) {
    if (index > 0) await new Promise((resolve) => setTimeout(resolve, 1100));
    const result = await attemptGeocode(url, description);
    if (!("empty" in result)) return result;
    lastReason = result.reason;
  }
  return { reason: lastReason };
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
