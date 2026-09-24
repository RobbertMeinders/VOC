"use client";

import { useState, useTransition } from "react";

// Mirror van RejectActivityForm: kanaalkeuze inklapbaar achter de
// "Goedkeuren"-knop i.p.v. de standaardrij te verzwaren met twee checkboxen
// die vrijwel altijd op hun default (beide aan) blijven staan.
export function ApproveActivityForm({
  onApprove,
  size = "sm",
}: {
  onApprove: (notifyPush: boolean, notifyEmail: boolean) => Promise<void>;
  size?: "sm" | "xs";
}) {
  const [open, setOpen] = useState(false);
  const [notifyPush, setNotifyPush] = useState(true);
  const [notifyEmail, setNotifyEmail] = useState(true);
  const [isPending, startTransition] = useTransition();

  const buttonClass =
    size === "xs"
      ? "rounded-full bg-voc-red px-3 py-1.5 text-xs font-medium text-white hover:bg-voc-red-dark disabled:opacity-60"
      : "rounded-full bg-voc-red px-3 py-1.5 text-sm font-medium text-white hover:bg-voc-red-dark disabled:opacity-60";

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className={buttonClass}>
        Goedkeuren
      </button>
    );
  }

  return (
    <div className="flex flex-col gap-2 rounded-lg border border-border bg-background p-3">
      <div className="flex gap-4">
        <label className="flex items-center gap-1.5 text-xs text-foreground">
          <input type="checkbox" checked={notifyPush} onChange={(e) => setNotifyPush(e.target.checked)} className="rounded" />
          Push versturen
        </label>
        <label className="flex items-center gap-1.5 text-xs text-foreground">
          <input type="checkbox" checked={notifyEmail} onChange={(e) => setNotifyEmail(e.target.checked)} className="rounded" />
          E-mail versturen
        </label>
      </div>
      <div className="flex items-center gap-2">
        <button
          type="button"
          disabled={isPending}
          onClick={() => startTransition(() => onApprove(notifyPush, notifyEmail))}
          className={buttonClass}
        >
          {isPending ? "Bezig…" : "Bevestig goedkeuren"}
        </button>
        <button type="button" onClick={() => setOpen(false)} className="text-xs text-muted hover:underline">
          Annuleren
        </button>
      </div>
    </div>
  );
}
