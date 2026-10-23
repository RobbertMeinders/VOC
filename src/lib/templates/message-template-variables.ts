import type { VariableDef } from "@/components/ui/VariableEditor";

// Per-sjabloon realistische voorbeeldwaarden (zoals het ontwerpvoorbeeld
// toont: "Nieuwe activiteit: Netwerkborrel" i.p.v. een generiek
// "voorbeeld-title") — i.p.v. één globale lijst (zoals lib/templates/
// variables.ts voor de oude email_templates/push_templates deed), want
// hier verschilt het beschikbare {{var}}-token-palet écht per bericht.
// "link" staat hier bewust niet in: dat token is gereserveerd voor de
// vaste knop-CTA (zie message-render.ts) en is geen los invoegbare
// variabele in de body/after-tekst.
export const MESSAGE_TEMPLATE_VARIABLES: Record<string, VariableDef[]> = {
  "uit-nieuw": [{ key: "greeting", label: "Aanhef", example: "Beste Hebe," }],
  "uit-bestaand": [{ key: "greeting", label: "Aanhef", example: "Beste Hebe," }],
  "uit-collega": [
    { key: "greeting", label: "Aanhef", example: "Beste Hebe," },
    { key: "naam_uitnodiger", label: "Naam uitnodiger", example: "Anneke Hemmen" },
    { key: "bedrijf", label: "Bedrijf", example: "Grodal Expeditie B.V." },
  ],
  magic: [{ key: "greeting", label: "Aanhef", example: "Beste Hebe," }],
  reset: [{ key: "greeting", label: "Aanhef", example: "Beste Hebe," }],
  email: [{ key: "greeting", label: "Aanhef", example: "Beste Hebe," }],
  "nieuw-act": [
    { key: "title", label: "Titel", example: "Nieuwe activiteit: Netwerkborrel" },
    { key: "body", label: "Berichttekst", example: "Woensdag 18 november, 16:00 bij Van Berensteyn. Bekijk het programma en meld je aan." },
  ],
  herinnering: [
    { key: "title", label: "Titel", example: "Overmorgen: Netwerkborrel" },
    { key: "body", label: "Berichttekst", example: "Je bent aangemeld. Woensdag om 16:00 bij Van Berensteyn. Tot dan!" },
  ],
  wachtlijst: [
    { key: "title", label: "Titel", example: "Je bent aangemeld voor Netwerkborrel" },
    { key: "body", label: "Berichttekst", example: "Er kwam een plek vrij en je stond op de wachtlijst." },
  ],
  reactie: [
    { key: "title", label: "Titel", example: "Anneke Hemmen heeft gereageerd op je bericht" },
    { key: "body", label: "Berichttekst", example: "“Leuk initiatief! Ik doe graag mee.”" },
  ],
  genoemd: [
    { key: "title", label: "Titel", example: "Henk Beuker heeft je genoemd in de community" },
    { key: "body", label: "Berichttekst", example: "“@Robbert, weet jij een goede fotograaf?”" },
  ],
  "nieuw-lid": [
    { key: "title", label: "Titel", example: "Welkom aan Hebe Jager van Grodal Expeditie B.V." },
    { key: "body", label: "Berichttekst", example: "Het netwerk van de VOC is weer gegroeid." },
  ],
  "aanmelding-bevestiging": [
    { key: "greeting", label: "Aanhef", example: "Beste Hebe," },
    { key: "title", label: "Titel activiteit", example: "Netwerkborrel" },
    { key: "datum", label: "Datum en tijd", example: "woensdag 18 november, 16:00" },
    { key: "extra", label: "Extra zin (status-afhankelijk)", example: "Je hebt ook een openstaande uitnodiging voor het ledenportaal." },
    { key: "afmeldlink", label: "Link om aanmelding in te trekken", example: "https://vocveendam.nl/afmelden?token=..." },
  ],
};

export function variablesForMessageTemplate(key: string): VariableDef[] {
  return MESSAGE_TEMPLATE_VARIABLES[key] ?? [];
}
