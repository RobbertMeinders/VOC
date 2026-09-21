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
      <button
        type="button"
        onClick={() => setValue(null)}
        className={clsx(
          "rounded-full px-2.5 py-1 text-xs font-medium",
          value === null ? "bg-voc-red text-white" : "bg-black/[.06] text-muted hover:bg-black/[.1] dark:bg-white/[.08]"
        )}
      >
        Geen label
      </button>
      {POST_TYPES.map((type) => (
        <button
          key={type}
          type="button"
          onClick={() => setValue(type)}
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
