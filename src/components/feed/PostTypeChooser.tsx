"use client";

import { HelpCircle, Megaphone, Sparkles, UserPlus, MoreHorizontal } from "lucide-react";
import type { FeedPostType } from "@/lib/feed/types";

// Vóór het schrijven van de tekst kiest het lid eerst wat voor bericht het
// is — de keuze zet automatisch de bijbehorende categorietag (zie
// createPostAction). "Iets anders" is een bewuste keuze voor GEEN tag
// (type null), geen "nog niet gekozen"-staat — zie PostComposer voor hoe
// dat onderscheid gemaakt wordt.
export const POST_TYPE_CHOICES: { type: FeedPostType | null; label: string; icon: typeof HelpCircle }[] = [
  { type: "vraag", label: "Ik heb een vraag", icon: HelpCircle },
  { type: "aanbod", label: "Ik heb iets aan te bieden", icon: Megaphone },
  { type: "nieuws", label: "Ik wil iets delen", icon: Sparkles },
  { type: "voorstellen", label: "Ik wil mezelf voorstellen", icon: UserPlus },
  { type: null, label: "Iets anders", icon: MoreHorizontal },
];

export function PostTypeChooser({ onChoose }: { onChoose: (type: FeedPostType | null) => void }) {
  return (
    <div className="flex flex-col gap-1.5">
      <p className="text-sm font-medium text-foreground">Wat wil je plaatsen?</p>
      {POST_TYPE_CHOICES.map(({ type, label, icon: Icon }) => (
        <button
          key={label}
          type="button"
          onClick={() => onChoose(type)}
          className="flex items-center gap-3 rounded-xl border border-border px-3.5 py-2.5 text-left text-sm font-medium text-foreground hover:border-voc-red hover:text-voc-red-text"
        >
          <Icon size={18} className="shrink-0 text-muted" />
          {label}
        </button>
      ))}
    </div>
  );
}
