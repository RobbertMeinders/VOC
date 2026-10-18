"use client";

import { useState, useTransition } from "react";
import { applyToCommissionAction } from "@/app/(app)/vereniging/commissies/actions";
import { useToast } from "@/lib/ui/ToastContext";

export function CommissionApplyButton({ commissionId, commissionName }: { commissionId: string; commissionName: string }) {
  const [isPending, startTransition] = useTransition();
  const [applied, setApplied] = useState(false);
  const toast = useToast();

  if (applied) {
    return <span className="text-xs font-medium text-muted">Aanvraag in behandeling</span>;
  }

  return (
    <button
      type="button"
      disabled={isPending}
      onClick={() => {
        // Niet meteen versturen op één klik — dit is een aanvraag die het
        // bestuur beoordeelt en die je zelf niet meer kunt intrekken, dus
        // verdient een expliciete bevestiging in plaats van direct effect.
        if (!window.confirm(`Aanmelden voor ${commissionName}? Je aanvraag wordt ter beoordeling voorgelegd aan het bestuur.`)) return;
        startTransition(async () => {
          const result = await applyToCommissionAction(commissionId);
          if (result.error) {
            toast(result.error);
          } else {
            toast("Aanmelding verstuurd.");
            setApplied(true);
          }
        });
      }}
      className="rounded-full bg-voc-red px-3.5 py-1.5 text-xs font-medium text-white hover:bg-voc-red-dark disabled:opacity-60"
    >
      {isPending ? "Bezig…" : "Aanmelden"}
    </button>
  );
}
