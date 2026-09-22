"use client";

import Image from "next/image";
import { Building2, User } from "lucide-react";
import type { MentionKind, MentionResults } from "@/lib/feed/mentionTypes";

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
    <span className="flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-full bg-voc-red-light text-voc-red">
      <Icon size={12} />
    </span>
  );
}

export function MentionDropdown({
  results,
  onSelect,
}: {
  results: MentionResults;
  onSelect: (name: string, kind: MentionKind, id: string) => void;
}) {
  return (
    <div className="absolute left-0 top-full z-50 mt-1 max-h-56 w-64 overflow-y-auto rounded-xl border border-border bg-surface py-1 shadow-lg">
      {results.profiles.map((profile) => (
        <button
          key={`profiel-${profile.id}`}
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => onSelect(profile.name, "profiel", profile.id)}
          className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-foreground hover:bg-black/[.04] dark:hover:bg-white/[.06]"
        >
          <SuggestionImage imageUrl={profile.imageUrl} kind="profiel" />
          <span className="truncate">{profile.name}</span>
        </button>
      ))}
      {results.companies.map((company) => (
        <button
          key={`bedrijf-${company.id}`}
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => onSelect(company.name, "bedrijf", company.id)}
          className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-foreground hover:bg-black/[.04] dark:hover:bg-white/[.06]"
        >
          <SuggestionImage imageUrl={company.imageUrl} kind="bedrijf" />
          <span className="truncate">{company.name}</span>
        </button>
      ))}
    </div>
  );
}
