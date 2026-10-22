"use client";

import { useState, useTransition } from "react";
import { LogOut } from "lucide-react";
import { forceLogoutAllMembersAction } from "@/app/(app)/beheer/instellingen/actions";
import { useConfirm } from "@/lib/ui/ConfirmDialogContext";

export function ForceLogoutAllButton() {
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [isPending, startTransition] = useTransition();
  const confirm = useConfirm();

  async function handleClick() {
    const confirmed = await confirm({
      title: "Alle leden uitloggen?",
      description: "Iedereen moet opnieuw inloggen, behalve jijzelf. Gebruik dit alleen bij een vermoede gelekte sessie of ander beveiligingsincident.",
      confirmLabel: "Iedereen uitloggen",
      danger: true,
    });
    if (!confirmed) return;

    setError(null);
    startTransition(async () => {
      const result = await forceLogoutAllMembersAction();
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
        className="flex h-9 w-fit items-center justify-center gap-1.5 rounded-lg border border-danger px-3 text-sm font-medium text-danger-text hover:bg-danger-soft disabled:opacity-60"
      >
        <LogOut size={14} />
        {isPending ? "Bezig…" : done ? "Iedereen uitgelogd" : "Alle leden uitloggen"}
      </button>
      {error && <p className="text-xs text-danger-text">{error}</p>}
    </div>
  );
}
