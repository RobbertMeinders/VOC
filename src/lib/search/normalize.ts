// UX-review Z4: zoeken was hoofdletter-gevoelig genoeg (".toLowerCase()"
// overal) maar negeerde accenten ("cafe" vond "Café" niet). NFD-normaliseren
// en de losse accent-tekens wegstrippen lost dat zonder externe library op.
export function normalizeForSearch(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();
}

// Eén plek voor "zoekt deze rij op query X in één van deze velden" — elke
// lijst geeft zijn eigen set velden mee (zie Z4: welke velden per lijst
// doorzocht worden verschilt), maar de matchlogica zelf is overal gelijk.
export function matchesSearch(fields: (string | null | undefined)[], query: string): boolean {
  const normalizedQuery = normalizeForSearch(query);
  if (!normalizedQuery) return true;
  return fields.some((field) => field && normalizeForSearch(field).includes(normalizedQuery));
}
