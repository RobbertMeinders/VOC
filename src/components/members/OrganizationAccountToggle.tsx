"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/Button";
import { updateMemberOrganizationAccountAction } from "@/app/(app)/leden/[id]/actions";

// Voor het account van de organisatie zelf (bijv. reageert als "VOC" in de
// feed) — geen echte collega om tussen de leden te zien staan. Omkeerbaar en
// zonder gevolgen voor rechten/functionaliteit, dus geen bevestiging nodig
// zoals bij MemberActiveToggle.
export function OrganizationAccountToggle({
  memberId,
  initialValue,
  compact = false,
}: {
  memberId: string;
  initialValue: boolean;
  compact?: boolean;
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
    <div className={compact ? "flex flex-col gap-1" : "flex flex-col gap-1.5 rounded-lg border border-border bg-background p-3"}>
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm text-foreground">
          {value ? "Organisatieaccount — niet in ledenlijst" : "Gewoon lid in de ledenlijst"}
        </span>
        <Button type="button" variant="secondary" size="sm" onClick={handleToggle} disabled={pending}>
          {pending ? "Bezig…" : value ? "Toon in ledenlijst" : "Verberg uit ledenlijst"}
        </Button>
      </div>
      {error && <p className="text-xs text-voc-red-text">{error}</p>}
    </div>
  );
}
