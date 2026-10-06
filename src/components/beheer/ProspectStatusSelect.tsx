"use client";

import { useState, useTransition } from "react";
import { updateProspectStatusAction, type ProspectStatus } from "@/app/(app)/beheer/prospects/actions";

export const PROSPECT_STATUS_LABELS: Record<ProspectStatus, string> = {
  nog_te_beoordelen: "Nog te beoordelen",
  wil_lid_worden: "Wil lid worden",
  wil_niet_lid_worden: "Wil niet lid worden",
  geen_antwoord: "Geen antwoord",
};

export function ProspectStatusSelect({ prospectId, initialStatus }: { prospectId: string; initialStatus: ProspectStatus }) {
  const [status, setStatus] = useState(initialStatus);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleChange(next: ProspectStatus) {
    const previous = status;
    setStatus(next);
    setError(null);
    startTransition(async () => {
      const result = await updateProspectStatusAction(prospectId, next);
      if (result.error) {
        setStatus(previous);
        setError(result.error);
      }
    });
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <select
        value={status}
        disabled={isPending}
        onChange={(e) => handleChange(e.target.value as ProspectStatus)}
        className="h-9 rounded-lg border border-input-border bg-surface px-2 text-sm text-foreground focus:border-voc-red focus:outline-none focus:ring-2 focus:ring-voc-red/20 disabled:opacity-60"
      >
        {(Object.keys(PROSPECT_STATUS_LABELS) as ProspectStatus[]).map((value) => (
          <option key={value} value={value}>
            {PROSPECT_STATUS_LABELS[value]}
          </option>
        ))}
      </select>
      {error && <p className="text-right text-xs text-voc-red-text">{error}</p>}
    </div>
  );
}
