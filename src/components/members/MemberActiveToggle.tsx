"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/Button";
import { updateMemberActiveAction } from "@/app/(app)/leden/[id]/actions";
import { useConfirm } from "@/lib/ui/ConfirmDialogContext";

export function MemberActiveToggle({
  memberId,
  initialActive,
  compact = false,
}: {
  memberId: string;
  initialActive: boolean;
  compact?: boolean;
}) {
  const [active, setActive] = useState(initialActive);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const confirm = useConfirm();

  async function handleToggle() {
    const next = !active;

    // Alleen bij het deactiveren zelf bevestigen (met de gevolgen erbij) —
    // heractiveren is altijd veilig/omkeerbaar.
    if (!next) {
      const confirmed = await confirm({
        title: "Lid deactiveren?",
        description:
          "Het account is dan direct niet meer bruikbaar en verdwijnt uit de ledenlijst. " +
          "Persoonsgegevens (naam, e-mail, telefoon, foto, functie, bio) worden na 90 dagen automatisch " +
          "verwijderd, tenzij het lid binnen die termijn weer geactiveerd wordt. " +
          'Geplaatste berichten en reacties blijven staan, wel voortaan onder "Verwijderd lid".',
        confirmLabel: "Deactiveren",
        danger: true,
      });
      if (!confirmed) return;
    }

    setError(null);
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
    <div className={compact ? "flex flex-col gap-1" : "flex flex-col gap-1.5 rounded-lg border border-border bg-background p-3"}>
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm text-foreground">Account is {active ? "actief" : "gedeactiveerd"}</span>
        <Button type="button" variant="secondary" size="sm" onClick={handleToggle} disabled={pending}>
          {pending ? "Bezig…" : active ? "Deactiveren" : "Activeren"}
        </Button>
      </div>
      {error && <p className="text-xs text-voc-red-text">{error}</p>}
    </div>
  );
}
