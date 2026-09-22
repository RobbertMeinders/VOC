"use client";

import { useState, useTransition } from "react";

const REASON_TEMPLATES = [
  "Past niet binnen het doel van de VOC-agenda",
  "Datum/tijd overlapt met een andere activiteit",
  "Onvoldoende informatie in de inzending",
  "Anders, namelijk…",
] as const;

// Bestuur kiest een sjabloonreden (die het tekstveld vult, nog te bewerken)
// of typt er los overheen — de indiener ziet deze reden terug in de
// afwijs-notificatie (zie decideActivitySubmissionAction).
export function RejectActivityForm({
  onReject,
}: {
  onReject: (reason: string) => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [isPending, startTransition] = useTransition();

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-full border border-border px-3 py-1.5 text-sm font-medium text-foreground hover:bg-black/[.04] dark:hover:bg-white/[.06]"
      >
        Afwijzen
      </button>
    );
  }

  return (
    <div className="w-full">
      <select
        onChange={(e) => {
          if (e.target.value) setReason(e.target.value);
          e.target.value = "";
        }}
        defaultValue=""
        className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-voc-red focus:outline-none focus:ring-2 focus:ring-voc-red/20"
      >
        <option value="" disabled>
          Kies een reden (optioneel als startpunt)…
        </option>
        {REASON_TEMPLATES.map((template) => (
          <option key={template} value={template === "Anders, namelijk…" ? "" : template}>
            {template}
          </option>
        ))}
      </select>
      <textarea
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        rows={3}
        required
        placeholder="Toelichting voor de indiener…"
        className="mt-2 w-full resize-none rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-voc-red focus:outline-none focus:ring-2 focus:ring-voc-red/20"
      />
      <div className="mt-2 flex items-center gap-2">
        <button
          type="button"
          disabled={isPending || !reason.trim()}
          onClick={() => startTransition(() => onReject(reason.trim()))}
          className="rounded-full bg-voc-red px-3 py-1.5 text-sm font-medium text-white hover:bg-voc-red-dark disabled:opacity-60"
        >
          {isPending ? "Bezig…" : "Afwijzen met deze reden"}
        </button>
        <button type="button" onClick={() => setOpen(false)} className="text-sm text-muted hover:underline">
          Annuleren
        </button>
      </div>
    </div>
  );
}
