"use client";

import { useState, useTransition } from "react";
import { KeyRound } from "lucide-react";
import { generateLoginLinkAction } from "@/app/(app)/leden/[id]/actions";

export function GenerateLoginLinkButton({ memberId }: { memberId: string }) {
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleClick() {
    setError(null);
    setCopied(false);
    startTransition(async () => {
      const result = await generateLoginLinkAction(memberId);
      if (result.error || !result.link) {
        setError(result.error ?? "Inloglink genereren is niet gelukt.");
        return;
      }
      try {
        await navigator.clipboard.writeText(result.link);
        setCopied(true);
      } catch {
        setError("Link gemaakt, maar kopiëren is niet gelukt.");
      }
    });
  }

  return (
    <div className="flex flex-col gap-1">
      <button
        type="button"
        onClick={handleClick}
        disabled={isPending}
        className="flex h-9 items-center justify-center gap-1.5 rounded-lg border border-border px-3 text-sm font-medium text-foreground hover:bg-black/[.04] disabled:opacity-60 dark:hover:bg-white/[.06]"
      >
        <KeyRound size={14} />
        {isPending ? "Bezig…" : copied ? "Link gekopieerd" : "Inloglink kopiëren"}
      </button>
      <p className="text-xs text-muted">Eenmalig bruikbaar en verloopt automatisch; alleen te gebruiken om dit lid te helpen inloggen.</p>
      {error && <p className="text-xs text-voc-red-text">{error}</p>}
    </div>
  );
}
