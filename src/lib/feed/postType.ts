import type { FeedPostType } from "./types";

export const POST_TYPE_LABELS: Record<FeedPostType, string> = {
  vraag: "Vraag",
  aanbod: "Aanbod",
  nieuws: "Nieuws & ervaringen",
  overig: "Overig",
  voorstellen: "Even voorstellen",
};

// Redesign fase 2: labelkleuren komen voortaan uit de tokens in globals.css
// (fase 1) i.p.v. losse Tailwind-standaardkleuren zonder donkere variant —
// "Nieuws & ervaringen" was rood, wordt paars (rood is schaars geworden).
export const POST_TYPE_BADGE_CLASS: Record<FeedPostType, string> = {
  vraag: "bg-label-vraag-bg text-label-vraag-text",
  aanbod: "bg-label-aanbod-bg text-label-aanbod-text",
  nieuws: "bg-label-nieuws-bg text-label-nieuws-text",
  overig: "bg-label-overig-bg text-label-overig-text",
  voorstellen: "bg-label-voorstellen-bg text-label-voorstellen-text",
};

// De drie categorieën met een eigen feedfilter — "Even voorstellen" en het
// oudere "overig" (niet meer zelf te kiezen, zie COMPOSER_POST_TYPES) horen
// hier bewust niet bij, zodat ze de drie standaardfilters niet vervuilen.
// Berichten met zo'n type blijven gewoon zichtbaar onder "Alles".
export const FEED_FILTER_TYPES: FeedPostType[] = ["vraag", "aanbod", "nieuws"];

// Zelf-kiesbare categorieën in de composer (nieuw bericht) en bij het
// (optioneel) aanpassen van het label op een bestaand bericht. "overig"
// is hier bewust uit gehaald — nieuwe berichten zonder van toepassing
// zijnde categorie krijgen voortaan geen label (null) i.p.v. "overig";
// bestaand al zo-gelabelde content behoudt gewoon zijn badge (zie
// POST_TYPE_LABELS/POST_TYPE_BADGE_CLASS hierboven, die 'overig' bewust
// laten staan) en de kolom accepteert de waarde nog steeds (0106).
export const COMPOSER_POST_TYPES: FeedPostType[] = ["vraag", "aanbod", "nieuws", "voorstellen"];
