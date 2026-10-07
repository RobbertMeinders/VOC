// UX-review U5: deze velden hadden alleen de browser's eigen validatie
// (type="url"/type="email") — een systeemballon in de taal van de browser,
// die ook nergens vastlegt wat er mis is zodra je script 'm zelf afvangt.
// Server-side (actions.ts) checkte tot nu toe alleen of een veld verplicht
// niet-leeg was, nooit het formaat — dus dit is de enige plek waar het
// formaat van een URL/e-mailadres echt gecontroleerd wordt.
const URL_PATTERN = /^https?:\/\/\S+\.\S+$/i;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateUrl(value: string, required = false): string | undefined {
  const trimmed = value.trim();
  if (!trimmed) return required ? "Dit veld is verplicht." : undefined;
  if (!URL_PATTERN.test(trimmed)) return "Vul een volledige link in, beginnend met https://";
  return undefined;
}

export function validateEmail(value: string, required = false): string | undefined {
  const trimmed = value.trim();
  if (!trimmed) return required ? "Vul een e-mailadres in." : undefined;
  if (!EMAIL_PATTERN.test(trimmed)) return "Vul een geldig e-mailadres in.";
  return undefined;
}
