"use client";

import { useState } from "react";
import { Chip } from "@/components/ui/Chip";
import { COMPOSER_POST_TYPES, POST_TYPE_LABELS } from "@/lib/feed/postType";
import type { FeedPostType } from "@/lib/feed/types";

// Alleen gebruikt bij het bewerken van een bestaand bericht — het label
// mag daar ontbreken/weggehaald worden, dus altijd optioneel. Het vooraf
// kiezen van een categorie bij een NIEUW bericht gebeurt via PostTypeChooser.
export function PostTypePicker({ defaultValue }: { defaultValue?: FeedPostType | null }) {
  const [value, setValue] = useState<FeedPostType | null>(defaultValue ?? null);

  return (
    <div>
      <input type="hidden" name="type" value={value ?? ""} />
      <div className="flex flex-wrap gap-1.5">
        {/* Klikken op het al-actieve label zet 'm weer uit — geen apart
            "Geen label"-knop nodig om dezelfde lege staat te bereiken. */}
        {COMPOSER_POST_TYPES.map((type) => (
          <Chip key={type} onClick={() => setValue(value === type ? null : type)} active={value === type}>
            {POST_TYPE_LABELS[type]}
          </Chip>
        ))}
      </div>
    </div>
  );
}
