export type NewsletterTextBlock = {
  id: string;
  type: "text";
  title?: string;
  body: string;
};

export type NewsletterImageBlock = {
  id: string;
  type: "image";
  url: string;
  layout: "full" | "left" | "right";
  title?: string;
  body?: string;
};

export type NewsletterButtonBlock = {
  id: string;
  type: "button";
  label: string;
  url: string;
  // Bepaalt de knopkleur: rood voor een bestemming binnen het ledenportaal
  // zelf, groen voor alles daarbuiten (bv. een extern aanmeldformulier) —
  // dezelfde kleurafspraak die de bestaande VOC-mails al gebruiken.
  linkType: "intern" | "extern";
};

export type NewsletterDividerBlock = {
  id: string;
  type: "divider";
};

// Een momentopname van een activiteit op het moment van toevoegen/verversen
// — geen live koppeling. Zo blijft een concept stabiel als de activiteit
// zelf nog wijzigt, en is het resultaat na verzending nooit met
// terugwerkende kracht anders dan wat er daadwerkelijk verstuurd is.
// imageUrl verwijst naar een kopie in de publieke email-assets-bucket (het
// origineel staat in de besloten activity-images-bucket), nodig omdat een
// nieuwsbrief weken later geopend kan worden terwijl een signed URL allang
// verlopen is.
export type NewsletterEventBlock = {
  id: string;
  type: "event";
  activityId: string;
  title: string;
  startsAtIso: string;
  endsAtIso: string | null;
  location: string | null;
  description: string | null;
  imageUrl: string | null;
  linkUrl: string;
  // Alleen voor de nieuwsbrief — komt nooit van de activiteit zelf, dus
  // blijft (in tegenstelling tot titel/locatie/omschrijving) altijd staan
  // als het Evenement-blok ververst wordt.
  buttonLabel: string;
};

export type NewsletterBlock =
  | NewsletterTextBlock
  | NewsletterImageBlock
  | NewsletterButtonBlock
  | NewsletterDividerBlock
  | NewsletterEventBlock;

export const BLOCK_TYPE_LABELS: Record<NewsletterBlock["type"], string> = {
  text: "Tekst",
  image: "Afbeelding",
  button: "Knop",
  divider: "Scheidingslijn",
  event: "Evenement",
};
