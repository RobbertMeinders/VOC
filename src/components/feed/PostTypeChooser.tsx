"use client";

import { HelpCircle, Megaphone, Sparkles, UserPlus } from "lucide-react";
import { COMPOSER_POST_TYPES, POST_TYPE_LABELS } from "@/lib/feed/postType";
import type { FeedPostType } from "@/lib/feed/types";

// Vóór het schrijven van de tekst kiest het lid eerst wat voor bericht het
// is — de keuze zet automatisch de bijbehorende categorietag (zie
// createPostAction). Gebruikt nu COMPOSER_POST_TYPES/POST_TYPE_LABELS
// (postType.ts) rechtstreeks i.p.v. een eigen, los bijgehouden lijst: die
// twee liepen uiteen (hier stond nog "Nieuws & ervaringen" i.p.v.
// "Ervaring", en een eigen "Overig"-knop terwijl die elders al niet meer
// zelf te kiezen is) — vanaf nu is er maar één bron voor welke categorieën
// er zijn en hoe ze heten.
const ICONS: Record<FeedPostType, typeof HelpCircle> = {
  vraag: HelpCircle,
  aanbod: Megaphone,
  nieuws: Sparkles,
  voorstellen: UserPlus,
  overig: HelpCircle,
};

// Afwerkronde blok 5: de vier keuzes komen na elkaar in i.p.v. allemaal
// tegelijk — zelfde ritme (30ms per stap) als het hamburger-/profielmenu.
const STAGGER_BASE_MS = 150;
const STAGGER_STEP_MS = 30;

export function PostTypeChooser({ onChoose }: { onChoose: (type: FeedPostType) => void }) {
  return (
    <div className="grid grid-cols-2 gap-2.5">
      {COMPOSER_POST_TYPES.map((type, i) => {
        const Icon = ICONS[type];
        return (
          <button
            key={type}
            type="button"
            onClick={() => onChoose(type)}
            style={{ animationDelay: `${STAGGER_BASE_MS + i * STAGGER_STEP_MS}ms` }}
            className="group animate-stagger-item flex flex-col items-center gap-2 rounded-2xl border border-border p-4 text-center transition-colors duration-150 hover:border-petrol hover:bg-petrol"
          >
            <span className="flex h-11 w-11 items-center justify-center rounded-full bg-black/5 text-foreground transition-colors duration-150 group-hover:bg-white/15 group-hover:text-white dark:bg-white/10">
              <Icon size={22} />
            </span>
            <span className="text-sm font-semibold text-foreground transition-colors duration-150 group-hover:text-white">
              {POST_TYPE_LABELS[type]}
            </span>
          </button>
        );
      })}
    </div>
  );
}
