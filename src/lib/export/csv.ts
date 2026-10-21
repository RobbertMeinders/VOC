// M12 (beveiligingsfixlijst Blok 3): een CSV-cel die begint met =, +, - of
// @ opent in Excel/Google Sheets als formule i.p.v. als tekst ("CSV-/
// formule-injectie") — met de juiste payload kan dat code laten draaien op
// de computer van wie het bestand opent. Relevant zodra een cel waarde uit
// een onbeveiligde bron kan bevatten (bv. een anonieme, externe aanmelding)
// terechtkomt. Een voorloop-apostrof dwingt die cel als platte tekst te
// lezen; elke cel wordt bovendien altijd (niet alleen waar "nodig") tussen
// aanhalingstekens gezet.
const FORMULA_PREFIX_CHARS = new Set(["=", "+", "-", "@"]);

export function csvEscape(value: string): string {
  const safeValue = FORMULA_PREFIX_CHARS.has(value[0]) ? `'${value}` : value;
  return `"${safeValue.replace(/"/g, '""')}"`;
}
