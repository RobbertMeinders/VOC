import type { FeedPostType } from "./types";

export const POST_TYPE_LABELS: Record<FeedPostType, string> = {
  vraag: "Vraag",
  aanbod: "Aanbod",
  nieuws: "Nieuws & ervaringen",
  overig: "Overig",
  voorstellen: "Even voorstellen",
};

export const POST_TYPE_BADGE_CLASS: Record<FeedPostType, string> = {
  vraag: "bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400",
  aanbod: "bg-green-50 text-green-700 dark:bg-green-500/10 dark:text-green-400",
  nieuws: "bg-voc-red-light text-voc-red-text",
  overig: "bg-black/[.06] text-muted dark:bg-white/[.08]",
  voorstellen: "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400",
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
