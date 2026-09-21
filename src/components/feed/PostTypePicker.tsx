"use client";

import { useState } from "react";
import { clsx } from "clsx";
import { POST_TYPES, POST_TYPE_LABELS } from "@/lib/feed/postType";
import type { FeedPostType } from "@/lib/feed/types";

export function PostTypePicker({ defaultValue }: { defaultValue?: FeedPostType | null }) {
  const [value, setValue] = useState<FeedPostType | null>(defaultValue ?? null);

  return (
    <div className="flex flex-wrap gap-1.5">
      <input type="hidden" name="type" value={value ?? ""} />
      {/* Klikken op het al-actieve label zet 'm weer uit — geen aparte
          "Geen label"-knop nodig om dezelfde lege staat te bereiken. */}
      {POST_TYPES.map((type) => (
        <button
          key={type}
          type="button"
          onClick={() => setValue((current) => (current === type ? null : type))}
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
  );
}
