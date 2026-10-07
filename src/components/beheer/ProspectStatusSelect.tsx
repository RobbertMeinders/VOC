"use client";

import { useState, useTransition } from "react";
import { Select } from "@/components/ui/Select";
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
      <Select
        value={status}
        disabled={isPending}
        onChange={(e) => handleChange(e.target.value as ProspectStatus)}
        className="h-9 pl-2"
      >
        {(Object.keys(PROSPECT_STATUS_LABELS) as ProspectStatus[]).map((value) => (
          <option key={value} value={value}>
            {PROSPECT_STATUS_LABELS[value]}
          </option>
        ))}
      </Select>
      {error && <p className="text-right text-xs text-voc-red-text">{error}</p>}
    </div>
  );
}
