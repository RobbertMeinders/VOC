"use client";

import Image from "next/image";
import { Building2, User } from "lucide-react";
import { flattenMentionResults, mentionOptionId, type MentionKind, type MentionResults } from "@/lib/feed/mentionTypes";

function SuggestionImage({ imageUrl, kind }: { imageUrl: string | null; kind: MentionKind }) {
  if (imageUrl) {
    return (
      <Image
        src={imageUrl}
        alt=""
        width={22}
        height={22}
        className={kind === "profiel" ? "h-[22px] w-[22px] shrink-0 rounded-full object-cover" : "h-[22px] w-[22px] shrink-0 rounded object-contain"}
      />
    );
  }
  const Icon = kind === "profiel" ? User : Building2;
  return (
    <span className="flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-full bg-petrol-soft text-petrol">
      <Icon size={12} />
    </span>
  );
}

export function MentionDropdown({
  listboxId,
  results,
  highlightedIndex,
  onSelect,
}: {
  listboxId: string;
  results: MentionResults;
  highlightedIndex: number;
  onSelect: (name: string, kind: MentionKind, id: string) => void;
}) {
  const flat = flattenMentionResults(results);
  return (
    <div
      id={listboxId}
      role="listbox"
      className="absolute left-0 top-full z-50 mt-1 max-h-56 w-64 overflow-y-auto rounded-xl border border-border bg-surface py-1 shadow-lg"
    >
      {flat.map((item, index) => (
        <button
          key={`${item.kind}-${item.id}`}
          id={mentionOptionId(listboxId, item.kind, item.id)}
          role="option"
          aria-selected={index === highlightedIndex}
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => onSelect(item.name, item.kind, item.id)}
          className={`flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-foreground ${
            index === highlightedIndex ? "bg-black/[.04] dark:bg-white/[.06]" : ""
          }`}
        >
          <SuggestionImage imageUrl={item.imageUrl} kind={item.kind} />
          <span className="truncate">{item.name}</span>
        </button>
      ))}
    </div>
  );
}
