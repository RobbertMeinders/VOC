"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { useEscapeKey } from "@/lib/dom/useEscapeKey";
import { useBodyScrollLock } from "@/lib/dom/useBodyScrollLock";
import { reportPostAction } from "@/app/(app)/actions";

const REASONS: { value: string; label: string }[] = [
  { value: "ongepast", label: "Ongepast" },
  { value: "spam", label: "Spam" },
  { value: "misleidend", label: "Misleidend" },
  { value: "anders", label: "Anders, namelijk…" },
];

// Vaste redenen (dropdown) + een altijd beschikbaar vrij tekstveld voor
// toelichting — bij "Anders" is dat veld het enige dat de reden vastlegt.
// Rapportages komen bij bestuur/beheer terecht (notificatie + /beheer/
// rapportages), die de daadwerkelijke keuze maken (bericht verwijderen of
// de melding afwijzen).
export function ReportPostOverlay({ postId, onClose }: { postId: string; onClose: () => void }) {
  const [reason, setReason] = useState("ongepast");
  const [details, setDetails] = useState("");
  const [state, setState] = useState<{ error?: string; success?: boolean; pending?: boolean }>({});

  useEscapeKey(true, onClose);
  useBodyScrollLock(true);

  async function handleSubmit() {
    setState({ pending: true });
    const result = await reportPostAction(postId, reason, details);
    setState(result);
  }

  return (
    <>
      <div className="fixed inset-0 z-40 cursor-pointer bg-black/60 animate-fade-in" onClick={onClose} />
      <div className="fixed inset-x-3 top-1/2 z-50 -translate-y-1/2 sm:inset-x-0 sm:mx-auto sm:w-full sm:max-w-sm sm:px-3">
        <div className="animate-scale-in rounded-2xl border border-border bg-surface shadow-lg">
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <p className="text-sm font-semibold text-foreground">Bericht rapporteren</p>
            <button
              type="button"
              onClick={onClose}
              aria-label="Sluiten"
              className="flex h-7 w-7 items-center justify-center rounded-full text-muted hover:bg-black/[.04] hover:text-voc-red dark:hover:bg-white/[.08]"
            >
              <X size={16} />
            </button>
          </div>

          {state.success ? (
            <div className="p-4">
              <p className="text-sm text-foreground">
                Bedankt, je melding is verstuurd naar bestuur/beheer.
              </p>
              <button
                type="button"
                onClick={onClose}
                className="mt-3 rounded-full bg-voc-red px-3 py-1.5 text-sm font-medium text-white hover:bg-voc-red-dark"
              >
                Sluiten
              </button>
            </div>
          ) : (
            <div className="p-4">
              <label className="text-xs font-medium text-muted">Reden</label>
              <select
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-voc-red focus:outline-none focus:ring-2 focus:ring-voc-red/20"
              >
                {REASONS.map((r) => (
                  <option key={r.value} value={r.value}>
                    {r.label}
                  </option>
                ))}
              </select>
              <label className="mt-3 block text-xs font-medium text-muted">
                Toelichting {reason === "anders" && "(verplicht)"}
              </label>
              <textarea
                value={details}
                onChange={(e) => setDetails(e.target.value)}
                rows={3}
                placeholder="Optionele toelichting…"
                className="mt-1 w-full resize-none rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-voc-red focus:outline-none focus:ring-2 focus:ring-voc-red/20"
              />
              {state.error && <p className="mt-2 text-xs text-voc-red">{state.error}</p>}
              <div className="mt-3 flex items-center gap-2">
                <button
                  type="button"
                  disabled={state.pending || (reason === "anders" && !details.trim())}
                  onClick={handleSubmit}
                  className="rounded-full bg-voc-red px-3 py-1.5 text-sm font-medium text-white hover:bg-voc-red-dark disabled:opacity-60"
                >
                  {state.pending ? "Versturen…" : "Rapporteren"}
                </button>
                <button type="button" onClick={onClose} className="text-sm text-muted hover:underline">
                  Annuleren
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
