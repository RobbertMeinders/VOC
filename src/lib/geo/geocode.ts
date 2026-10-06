import "server-only";

// Gratis geocoding via OpenStreetMap's Nominatim (geen API-key nodig). Hun
// gebruiksvoorwaarden vragen max. 1 aanroep per seconde en een herkenbare
// User-Agent — ruim voldoende voor dit incidentele gebruik (alleen bij het
// opslaan van een bedrijfsadres door bestuur/beheer, niet bij elke
// paginaweergave).
const NOMINATIM_URL = "https://nominatim.openstreetmap.org/search";

type GeocodeSuccess = { latitude: number; longitude: number };
type GeocodeFailure = { reason: string };

// Variant die ook de mislukkingsreden teruggeeft — nodig om in de
// beheer-UI (regeocodeMissingCompaniesAction) te kunnen tonen wáárom
// Nominatim niets opleverde (bv. status 403 vanaf Vercel's IP-reeksen,
// een bekend probleem bij cloud-gehoste apps) i.p.v. alleen "0 hersteld".
async function geocodeAddressDetailed(parts: {
  address?: string | null;
  postalCode?: string | null;
  city?: string | null;
}): Promise<GeocodeSuccess | GeocodeFailure> {
  if (!parts.address && !parts.city) return { reason: "geen adres opgegeven" };

  const query = [parts.address, parts.postalCode, parts.city, "Nederland"].filter(Boolean).join(", ");
  const url = `${NOMINATIM_URL}?format=json&limit=1&countrycodes=nl&q=${encodeURIComponent(query)}`;

  try {
    const response = await fetch(url, {
      headers: { "User-Agent": "VOC-Ledenportaal-PWA/1.0" },
    });
    if (!response.ok) {
      return { reason: `Nominatim gaf status ${response.status} voor "${query}"` };
    }

    const results = (await response.json()) as { lat: string; lon: string }[];
    const first = results[0];
    if (!first) {
      return { reason: `geen resultaat van Nominatim voor "${query}"` };
    }

    const latitude = Number.parseFloat(first.lat);
    const longitude = Number.parseFloat(first.lon);
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      return { reason: `ongeldige coördinaten in Nominatim-resultaat voor "${query}"` };
    }

    return { latitude, longitude };
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : String(cause);
    return { reason: `aanroep naar Nominatim mislukt voor "${query}": ${message}` };
  }
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
