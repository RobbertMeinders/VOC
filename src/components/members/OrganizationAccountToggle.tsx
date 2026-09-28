"use client";

import { useState, useTransition } from "react";
import { updateMemberOrganizationAccountAction } from "@/app/(app)/leden/[id]/actions";

// Voor het account van de organisatie zelf (bijv. reageert als "VOC" in de
// feed) — geen echte collega om tussen de leden te zien staan. Omkeerbaar en
// zonder gevolgen voor rechten/functionaliteit, dus geen bevestiging nodig
// zoals bij MemberActiveToggle.
export function OrganizationAccountToggle({
  memberId,
  initialValue,
}: {
  memberId: string;
  initialValue: boolean;
}) {
  const [value, setValue] = useState(initialValue);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleToggle() {
    const next = !value;
    setError(null);
    startTransition(async () => {
      const result = await updateMemberOrganizationAccountAction(memberId, next);
      if (result.error) {
        setError(result.error);
      } else {
        setValue(next);
      }
    });
  }

  return (
    <div className="flex flex-col gap-1.5 rounded-lg border border-border bg-background p-3">
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm text-foreground">
          {value ? "Organisatieaccount — niet in ledenlijst" : "Gewoon lid in de ledenlijst"}
        </span>
        <button
          type="button"
          onClick={handleToggle}
          disabled={pending}
          className={
            value
              ? "rounded-full border border-border px-3 py-1.5 text-xs font-medium text-voc-red hover:border-voc-red disabled:opacity-60"
              : "rounded-full bg-voc-red px-3 py-1.5 text-xs font-medium text-white hover:bg-voc-red-dark disabled:opacity-60"
          }
        >
          {pending ? "Bezig…" : value ? "Toon in ledenlijst" : "Verberg uit ledenlijst"}
        </button>
      </div>
      {error && <p className="text-xs text-voc-red">{error}</p>}
    </div>
  );
}
