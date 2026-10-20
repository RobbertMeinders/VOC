// Korte, voor testleden leesbare changelog — los bestand i.p.v. in de
// database, zodat het gewoon met de code meegaat en bij elke afgeronde
// testronde een paar regels bijkomen (zie docs/review/... voor de volledige,
// technische foutenrapporten). Nieuwste versie bovenaan.
export type ReleaseNote = { version: string; items: string[] };

export const RELEASE_NOTES: ReleaseNote[] = [
  {
    version: "0.9.0",
    items: [
      "Statistieken-pagina: een stapel tel- en weergavefouten opgelost (percentages tot 800%, dubbele maandlabels, verkeerde badge-aantallen in Beheer).",
      "Registratiepagina: bedrijf koppelen is niet meer verplicht om je account te activeren.",
      "Agendakaarten, de Leden/Bedrijven-schakelaar en de bestuurskaarten zijn opnieuw vormgegeven.",
      "Meldingen verwijderen kan nu ongedaan gemaakt worden.",
      "Deze testfase-pagina en het feedbackformulier zijn nieuw.",
    ],
  },
];

export function latestReleaseNote(): ReleaseNote | null {
  return RELEASE_NOTES[0] ?? null;
}
