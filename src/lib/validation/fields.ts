// UX-review U5: deze velden hadden alleen de browser's eigen validatie
// (type="url"/type="email") — een systeemballon in de taal van de browser,
// die ook nergens vastlegt wat er mis is zodra je script 'm zelf afvangt.
// Server-side (actions.ts) checkte tot nu toe alleen of een veld verplicht
// niet-leeg was, nooit het formaat — dus dit is de enige plek waar het
// formaat van een URL/e-mailadres echt gecontroleerd wordt.
const URL_PATTERN = /^https?:\/\/\S+\.\S+$/i;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Vult zelf https:// aan i.p.v. een ingevulde link zonder schema af te
// keuren — een bezoeker van het "lid worden"-formulier (embed op de
// website) typt vaak gewoon "vocveendam.nl" en moet daar niet voor worden
// teruggestuurd. Laat een waarde met een afwijkend schema (bv. "mailto:")
// expliciet met rust; die hoort hier toch al niet in thuis, en validateUrl
// vangt 'm alsnog af.
export function normalizeUrl(value: string): string {
  const trimmed = value.trim();
  if (!trimmed || /^[a-z][a-z0-9+.-]*:/i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

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

// M1 (beveiligingsfixlijst Blok 3): voor-/achternaam komen terecht in de
// weergavenaam van een e-mailafzender (sendMemberContactEmail) — <, >, @,
// komma en puntkomma kunnen daar een adresveld laten lijken op iets anders
// dan het echte, geverifieerde adres, en een regeleinde kan in sommige
// mailclients als headerinjectie worden gelezen. Verder gewoon vrije tekst
// (geen harde lengte/tekenset-eis) — dit is alleen de kleine lijst tekens
// die specifiek dat ene risico raakt.
const DANGEROUS_NAME_CHARS = /[<>@,;\r\n]/;

export function validateDisplayNamePart(value: string): string | undefined {
  if (DANGEROUS_NAME_CHARS.test(value)) {
    return "Dit veld mag niet de tekens < > @ , ; of een regeleinde bevatten.";
  }
  return undefined;
}
