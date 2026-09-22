"use client";

import { useState } from "react";
import { clsx } from "clsx";
import { POST_TYPES, POST_TYPE_LABELS } from "@/lib/feed/postType";
import type { FeedPostType } from "@/lib/feed/types";

// `required` bepaalt of er een label gekozen moet zijn voordat het bericht
// geplaatst kan worden (nieuw bericht) — bij bewerken van een bestaand
// bericht mag het label ontbreken/weggehaald worden, dus daar blijft het
// optioneel. Zonder `value`/`onChange` (bewerken) houdt dit component zijn
// eigen state bij; met required geeft de composer de state door zodat die
// ook de plaats-knop kan uitschakelen zolang er niets gekozen is.
export function PostTypePicker({
  defaultValue,
  required,
  value: controlledValue,
  onChange,
}: {
  defaultValue?: FeedPostType | null;
  required?: boolean;
  value?: FeedPostType | null;
  onChange?: (value: FeedPostType | null) => void;
}) {
  const [internalValue, setInternalValue] = useState<FeedPostType | null>(defaultValue ?? null);
  const value = controlledValue !== undefined ? controlledValue : internalValue;
  const setValue = onChange ?? setInternalValue;

  return (
    <div>
      <input type="hidden" name="type" value={value ?? ""} />
      <div className="flex flex-wrap gap-1.5">
        {/* Klikken op het al-actieve label zet 'm weer uit — geen aparte
            "Geen label"-knop nodig om dezelfde lege staat te bereiken, tenzij
            required: dan moet er altijd precies één gekozen blijven. */}
        {POST_TYPES.map((type) => (
          <button
            key={type}
            type="button"
            onClick={() => setValue(value === type && !required ? null : type)}
            className={clsx(
              "rounded-full px-2.5 py-1 text-xs font-medium",
              value === type
                ? "bg-voc-red text-white"
                : "bg-black/[.06] text-muted hover:bg-black/[.1] dark:bg-white/[.08]"
            )}
          >
            {POST_TYPE_LABELS[type]}
          </button>
        ))}
      </div>
      {required && !value && <p className="mt-1.5 text-xs text-muted">Kies een label voordat je plaatst.</p>}
    </div>
  );
}
