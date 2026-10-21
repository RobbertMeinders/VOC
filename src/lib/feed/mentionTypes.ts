import type { MentionSuggestion } from "@/app/(app)/actions";

export type MentionResults = { profiles: MentionSuggestion[]; companies: MentionSuggestion[] };
export type MentionKind = "profiel" | "bedrijf";

// Gedeeld tussen MentionEditor (aria-activedescendant) en MentionDropdown
// (id per optie) — dezelfde combinatie van kind+id moet op allebei exact
// hetzelfde element-id uitkomen.
export function mentionOptionId(listboxId: string, kind: MentionKind, id: string): string {
  return `${listboxId}-${kind}-${id}`;
}

// Platte, op volgorde-van-weergave gesorteerde lijst (profielen eerst, dan
// bedrijven — zelfde volgorde als MentionDropdown rendert) — nodig om met
// pijltjestoetsen door de suggesties te kunnen lopen.
export function flattenMentionResults(
  results: MentionResults
): { kind: MentionKind; id: string; name: string; imageUrl: string | null }[] {
  return [
    ...results.profiles.map((p) => ({ kind: "profiel" as const, id: p.id, name: p.name, imageUrl: p.imageUrl })),
    ...results.companies.map((c) => ({ kind: "bedrijf" as const, id: c.id, name: c.name, imageUrl: c.imageUrl })),
  ];
}
