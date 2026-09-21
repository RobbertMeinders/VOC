"use client";

import { Building2, User } from "lucide-react";
import type { MentionKind, MentionResults } from "@/lib/feed/useMentionField";

export function MentionDropdown({
  results,
  onSelect,
}: {
  results: MentionResults;
  onSelect: (name: string, kind: MentionKind, id: string) => void;
}) {
  return (
    <div className="absolute left-0 top-full z-10 mt-1 max-h-56 w-64 overflow-y-auto rounded-xl border border-border bg-surface py-1 shadow-lg">
      {results.profiles.map((profile) => (
        <button
          key={`profiel-${profile.id}`}
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => onSelect(profile.name, "profiel", profile.id)}
          className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-foreground hover:bg-black/[.04] dark:hover:bg-white/[.06]"
        >
          <User size={14} className="shrink-0 text-muted" />
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
          <Building2 size={14} className="shrink-0 text-muted" />
          <span className="truncate">{company.name}</span>
        </button>
      ))}
    </div>
  );
}
