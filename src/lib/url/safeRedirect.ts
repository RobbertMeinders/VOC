/**
 * Valideert een redirect-bestemming die uit een query-param of form-veld
 * komt (bv. ?next=...). `value.startsWith("/")` alleen is NIET genoeg: een
 * protocol-relative URL als "//evil.com" begint ook met "/", maar browsers
 * interpreteren het dubbele slash-voorvoegsel als "zelfde protocol, andere
 * host" en redirecten dus alsnog naar een externe site (open redirect).
 * "/\evil.com" wordt door sommige browsers ook als protocol-relative
 * behandeld, en een tussengevoegd stuurteken (bv. "/\t/evil.com") of een
 * gecodeerde variant kan een losse prefix-check als deze omzeilen terwijl
 * de browser 'm nog steeds als protocol-relative leest.
 *
 * M2 (beveiligingsfixlijst Blok 3): i.p.v. zelf elke ontwijkingstruc apart
 * te moeten blokkeren, laat dit de WHATWG URL-parser (dezelfde normalisatie
 * als een browser) de waarde interpreteren tegen een vaste, neutrale basis
 * en eist daarna dat de uitkomst exact dezelfde origin heeft als die basis
 * — elke variant die een browser alsnog als "andere host" zou lezen, faalt
 * daarmee vanzelf, zonder een lijst met specifieke tekens te hoeven
 * onderhouden.
 */
export function safeRedirectPath(value: string | null | undefined, fallback = "/"): string {
  if (!value) return fallback;
  if (!value.startsWith("/")) return fallback;

  const base = "http://localhost";
  try {
    const parsed = new URL(value, base);
    if (parsed.origin !== base) return fallback;
    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return fallback;
  }
}
