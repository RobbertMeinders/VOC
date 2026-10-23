// Gedeeld tussen MentionedText.tsx (rendert de tokens) en queries.ts
// (haalt alle genoemde profiel-id's uit berichttekst om te checken welke
// inmiddels geanonimiseerd zijn) -- één bron voor het patroon i.p.v. het op
// twee plekken los te laten uiteenlopen.
export const MENTION_PATTERN_SOURCE = "@\\[([^\\]]+)\\]\\((profiel|bedrijf):([0-9a-fA-F-]{36})\\)";

// Alle "profiel:<uuid>"-id's uit @-vermeldingen in een stuk tekst (negeert
// "bedrijf:"-vermeldingen -- bedrijven worden niet geanonimiseerd).
export function extractMentionedProfileIds(text: string): string[] {
  const pattern = new RegExp(MENTION_PATTERN_SOURCE, "g");
  const ids: string[] = [];
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(text))) {
    const [, , kind, id] = match;
    if (kind === "profiel") ids.push(id);
  }
  return ids;
}
