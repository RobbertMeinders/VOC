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
        {/* Alleen de uitzondering benoemen (bedrijfsaccount) — de normale
            toestand ("gewoon lid") spreekt voor zich en hoeft niet elke rij
            te herhalen. */}
        {value ? <span className="text-sm text-foreground">Bedrijfsaccount - niet in ledenlijst</span> : <span />}
        <Button
          type="button"
          variant={compact ? "ghost" : "secondary"}
          size="sm"
          onClick={handleToggle}
          disabled={pending}
          className={compact ? "h-auto px-2 py-0.5 text-xs text-muted" : undefined}
        >
          {pending ? "Bezig…" : value ? "Toon in ledenlijst" : "Verberg uit ledenlijst"}
        </Button>
      </div>
      {error && <p className="text-xs text-voc-red-text">{error}</p>}
    </div>
  );
}
