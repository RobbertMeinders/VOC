// M12 (beveiligingsfixlijst Blok 3): een CSV-cel die begint met =, +, - of
// @ opent in Excel/Google Sheets als formule i.p.v. als tekst ("CSV-/
// formule-injectie") — met de juiste payload kan dat code laten draaien op
// de computer van wie het bestand opent. Relevant zodra een cel waarde uit
// een onbeveiligde bron kan bevatten (bv. een anonieme, externe aanmelding)
// terechtkomt. Een voorloop-apostrof dwingt die cel als platte tekst te
// lezen; elke cel wordt bovendien altijd (niet alleen waar "nodig") tussen
// aanhalingstekens gezet.
const FORMULA_PREFIX_CHARS = new Set(["=", "+", "-", "@"]);

// \r (los, zonder \n) en \t binnen een cel zijn al onschadelijk binnen de
// aanhalingstekens hieronder voor een correcte CSV-parser, maar een
// naïevere downstream-consument die handmatig op regel/tab splitst i.p.v.
// een echte CSV-parser te gebruiken, kan zo'n cel toch als rij-/kolom-
// grens lezen — vervangen door respectievelijk niets en een spatie, zodat
// de celinhoud zelf nooit als structuur gelezen kan worden.
function neutralizeControlChars(value: string): string {
  return value.replace(/\r/g, "").replace(/\t/g, " ");
}

export function csvEscape(value: string): string {
  const neutralized = neutralizeControlChars(value);
  const safeValue = FORMULA_PREFIX_CHARS.has(neutralized[0]) ? `'${neutralized}` : neutralized;
  return `"${safeValue.replace(/"/g, '""')}"`;
}

// Zelfde voorloop-apostrof-truc, voor een .xlsx-cel (lidmaatschap-traject
// Deel 2, ledenexport): exceljs slaat een plain string altijd als
// shared-string op (nooit als formule), maar de voorloop-apostrof kost
// niets en voorkomt dat een cel die met =/+/-/@ begint ooit als formule
// gelezen wordt, ook als het bestand later in een ander programma bewerkt
// en opnieuw opgeslagen wordt.
export function xlsxSafeText(value: string): string {
  return FORMULA_PREFIX_CHARS.has(value[0]) ? `'${value}` : value;
}
