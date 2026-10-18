"use client";

import { HelpCircle, Megaphone, Sparkles, UserPlus, MoreHorizontal } from "lucide-react";
import type { FeedPostType } from "@/lib/feed/types";

// Vóór het schrijven van de tekst kiest het lid eerst wat voor bericht het
// is — de keuze zet automatisch de bijbehorende categorietag (zie
// createPostAction). "Overig" is een bewuste keuze voor GEEN tag (type
// null), geen "nog niet gekozen"-staat — zie PostComposer voor hoe dat
// onderscheid gemaakt wordt.
export const POST_TYPE_CHOICES: { type: FeedPostType; label: string; description: string; icon: typeof HelpCircle }[] = [
  { type: "vraag", label: "Vraag", description: "Stel een vraag aan andere leden.", icon: HelpCircle },
  { type: "aanbod", label: "Aanbod", description: "Deel een aanbod of mogelijkheid.", icon: Megaphone },
  { type: "nieuws", label: "Delen", description: "Deel nieuws of ervaringen.", icon: Sparkles },
  { type: "voorstellen", label: "Even voorstellen", description: "Stel jezelf en je bedrijf voor.", icon: UserPlus },
];

export function PostTypeChooser({ onChoose }: { onChoose: (type: FeedPostType | null) => void }) {
  return (
    <div className="flex flex-col gap-2.5">
      <p className="text-sm font-medium text-foreground">Wat wil je plaatsen?</p>

      <div className="grid grid-cols-2 gap-2">
        {POST_TYPE_CHOICES.map(({ type, label, description, icon: Icon }) => (
          <button
            key={type}
            type="button"
            onClick={() => onChoose(type)}
            className="flex flex-col items-start gap-1.5 rounded-xl border border-border p-3 text-left hover:border-voc-red hover:bg-voc-red-light"
          >
            <Icon size={19} className="shrink-0 text-voc-red-text" />
            <span className="text-sm font-semibold text-foreground">{label}</span>
            <span className="text-xs leading-snug text-muted">{description}</span>
          </button>
        ))}
      </div>

      <button
        type="button"
        onClick={() => onChoose(null)}
        className="flex items-center gap-2 rounded-xl border border-border px-3.5 py-2 text-left text-sm text-muted hover:border-voc-red hover:text-voc-red-text"
      >
        <MoreHorizontal size={16} className="shrink-0" />
        Overig — plaats zonder specifieke categorie
      </button>
    </div>
  );
}
