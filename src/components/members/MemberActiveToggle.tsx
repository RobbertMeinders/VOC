"use client";

import { useState, useTransition } from "react";
import { updateMemberActiveAction } from "@/app/(app)/leden/[id]/actions";

export function MemberActiveToggle({ memberId, initialActive }: { memberId: string; initialActive: boolean }) {
  const [active, setActive] = useState(initialActive);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleToggle() {
    setError(null);
    const next = !active;
    startTransition(async () => {
      const result = await updateMemberActiveAction(memberId, next);
      if (result.error) {
        setError(result.error);
      } else {
        setActive(next);
      }
    });
  }

  return (
    <div className="flex flex-col gap-1.5 rounded-lg border border-border bg-background p-3">
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm text-foreground">Account is {active ? "actief" : "gedeactiveerd"}</span>
        <button
          type="button"
          onClick={handleToggle}
          disabled={pending}
          className={
            active
              ? "rounded-full border border-border px-3 py-1.5 text-xs font-medium text-voc-red hover:border-voc-red disabled:opacity-60"
              : "rounded-full bg-voc-red px-3 py-1.5 text-xs font-medium text-white hover:bg-voc-red-dark disabled:opacity-60"
          }
        >
          {pending ? "Bezig…" : active ? "Deactiveren" : "Activeren"}
        </button>
      </div>
      {error && <p className="text-xs text-voc-red">{error}</p>}
    </div>
  );
}
