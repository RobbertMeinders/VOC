import type { MentionSuggestion } from "@/app/(app)/actions";

export type MentionResults = { profiles: MentionSuggestion[]; companies: MentionSuggestion[] };
export type MentionKind = "profiel" | "bedrijf";
