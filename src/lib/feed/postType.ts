import type { FeedPostType } from "./types";

export const POST_TYPE_LABELS: Record<FeedPostType, string> = {
  vraag: "Vraag",
  aanbod: "Aanbod",
  nieuws: "Nieuws",
  overig: "Overig",
};

export const POST_TYPE_BADGE_CLASS: Record<FeedPostType, string> = {
  vraag: "bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400",
  aanbod: "bg-green-50 text-green-700 dark:bg-green-500/10 dark:text-green-400",
  nieuws: "bg-voc-red-light text-voc-red",
  overig: "bg-black/[.06] text-muted dark:bg-white/[.08]",
};

export const POST_TYPES: FeedPostType[] = ["vraag", "aanbod", "nieuws", "overig"];
