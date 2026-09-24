"use client";

import { useState, useTransition } from "react";
import { updateMemberActiveAction } from "@/app/(app)/leden/[id]/actions";

export function MemberActiveToggle({ memberId, initialActive }: { memberId: string; initialActive: boolean }) {
  const [active, setActive] = useState(initialActive);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleToggle() {
    const next = !active;

    // Alleen bij het deactiveren zelf bevestigen (met de gevolgen erbij) —
    // heractiveren is altijd veilig/omkeerbaar.
    if (!next) {
      const confirmed = window.confirm(
        "Weet je zeker dat je dit lid wilt deactiveren?\n\n" +
          "Het account is dan direct niet meer bruikbaar en verdwijnt uit de ledenlijst. " +
          "Persoonsgegevens (naam, e-mail, telefoon, foto, functie, bio) worden na 90 dagen automatisch " +
          "verwijderd, tenzij het lid binnen die termijn weer geactiveerd wordt. " +
          "Geplaatste berichten en reacties blijven staan, wel voortaan onder \"Verwijderd lid\"."
      );
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
