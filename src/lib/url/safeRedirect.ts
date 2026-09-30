/**
 * Valideert een redirect-bestemming die uit een query-param of form-veld
 * komt (bv. ?next=...). `value.startsWith("/")` alleen is NIET genoeg: een
 * protocol-relative URL als "//evil.com" begint ook met "/", maar browsers
 * interpreteren het dubbele slash-voorvoegsel als "zelfde protocol, andere
 * host" en redirecten dus alsnog naar een externe site (open redirect).
 * "/\evil.com" wordt door sommige browsers (o.a. oudere Chrome/Edge) ook als
 * protocol-relative behandeld, dus die wordt hier ook geweigerd.
 */
export function safeRedirectPath(value: string | null | undefined, fallback = "/"): string {
  if (!value) return fallback;
  if (!value.startsWith("/")) return fallback;
  if (value.startsWith("//") || value.startsWith("/\\")) return fallback;
  return value;
}
