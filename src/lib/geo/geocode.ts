import "server-only";

// Gratis geocoding via OpenStreetMap's Nominatim (geen API-key nodig). Hun
// gebruiksvoorwaarden vragen max. 1 aanroep per seconde en een herkenbare
// User-Agent — ruim voldoende voor dit incidentele gebruik (alleen bij het
// opslaan van een bedrijfsadres door bestuur/beheer, niet bij elke
// paginaweergave).
const NOMINATIM_URL = "https://nominatim.openstreetmap.org/search";

export async function geocodeAddress(parts: {
  address?: string | null;
  postalCode?: string | null;
  city?: string | null;
}): Promise<{ latitude: number; longitude: number } | null> {
  if (!parts.address && !parts.city) return null;

  const query = [parts.address, parts.postalCode, parts.city, "Nederland"].filter(Boolean).join(", ");
  const url = `${NOMINATIM_URL}?format=json&limit=1&countrycodes=nl&q=${encodeURIComponent(query)}`;

  try {
    const response = await fetch(url, {
      headers: { "User-Agent": "VOC-Ledenportaal-PWA/1.0" },
    });
    if (!response.ok) {
      console.error(`[geocode] Nominatim gaf status ${response.status} voor "${query}"`);
      return null;
    }

    const results = (await response.json()) as { lat: string; lon: string }[];
    const first = results[0];
    if (!first) {
      console.error(`[geocode] Geen resultaat van Nominatim voor "${query}"`);
      return null;
    }

    const latitude = Number.parseFloat(first.lat);
    const longitude = Number.parseFloat(first.lon);
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;

    return { latitude, longitude };
  } catch (cause) {
    // Geocoding is best-effort: een bedrijf zonder coördinaten blijft
    // gewoon in de lijst staan, verschijnt alleen niet op de kaart.
    console.error(`[geocode] Aanroep naar Nominatim mislukt voor "${query}":`, cause);
    return null;
  }
}
