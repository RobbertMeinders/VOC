"use client";

import { useState, useTransition } from "react";
import { LogOut } from "lucide-react";
import { forceLogoutMemberAction } from "@/app/(app)/leden/[id]/actions";
import { useConfirm } from "@/lib/ui/ConfirmDialogContext";

export function ForceLogoutButton({ memberId, memberName }: { memberId: string; memberName: string }) {
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [isPending, startTransition] = useTransition();
  const confirm = useConfirm();

  async function handleClick() {
    const confirmed = await confirm({
      title: "Uitloggen?",
      description: `${memberName} wordt op alle apparaten uitgelogd en moet opnieuw inloggen.`,
      confirmLabel: "Uitloggen",
      danger: true,
    });
    if (!confirmed) return;

    setError(null);
    startTransition(async () => {
      const result = await forceLogoutMemberAction(memberId);
      if (result.error) {
        setError(result.error);
        return;
      }
      setDone(true);
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
        <LogOut size={14} />
        {isPending ? "Bezig…" : done ? "Uitgelogd" : "Uitloggen"}
      </button>
      {error && <p className="text-xs text-voc-red-text">{error}</p>}
    </div>
  );
}
