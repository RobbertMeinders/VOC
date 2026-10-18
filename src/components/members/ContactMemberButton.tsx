"use client";

import { useState, useTransition } from "react";
import { Mail, X } from "lucide-react";
import { sendMemberContactMessageAction } from "@/app/(app)/leden/[id]/contact-actions";
import { FloatingPortal } from "@/components/ui/FloatingPortal";
import { useEscapeKey } from "@/lib/dom/useEscapeKey";
import { useBodyScrollLock } from "@/lib/dom/useBodyScrollLock";
import { useToast } from "@/lib/ui/ToastContext";

// VOC Hub — Veilige e-mailcontactfunctie: nadrukkelijk geen chat, alleen een
// eenmalig formulier dat server-side een e-mail verstuurt (zie
// contact-actions.ts) — geen conversatiegeschiedenis, geen inbox in de app.
export function ContactMemberButton({ recipientId, recipientName }: { recipientId: string; recipientName: string }) {
  const [open, setOpen] = useState(false);
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const toast = useToast();

  useEscapeKey(open, () => setOpen(false));
  useBodyScrollLock(open);

  function reset() {
    setSubject("");
    setMessage("");
    setError(null);
  }

  function handleSubmit() {
    if (!subject.trim() || !message.trim()) {
      setError("Vul een onderwerp en bericht in.");
      return;
    }
    startTransition(async () => {
      const result = await sendMemberContactMessageAction(recipientId, subject, message);
      if (result.error) {
        setError(result.error);
        return;
      }
      setOpen(false);
      reset();
      toast("Bericht verstuurd.");
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex shrink-0 items-center gap-1.5 rounded-full border border-border bg-surface px-3 py-1.5 text-xs font-medium text-foreground hover:border-voc-red hover:text-voc-red-text"
      >
        <Mail size={14} />
        Neem contact op
      </button>

      {open && (
        <FloatingPortal>
          <div
            className="animate-fade-in fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center"
            onClick={() => setOpen(false)}
          >
            <div
              className="animate-scale-in w-full max-w-sm rounded-t-2xl border border-border bg-surface p-4 shadow-lg sm:rounded-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="mb-2 flex items-center justify-between">
                <h2 className="text-sm font-semibold text-foreground">Bericht aan {recipientName}</h2>
                <button type="button" onClick={() => setOpen(false)} aria-label="Sluiten" className="text-muted hover:text-foreground">
                  <X size={16} />
                </button>
              </div>
              <p className="mb-3 text-xs text-muted">
                {recipientName} ontvangt je bericht per e-mail en kan rechtstreeks op jou reageren. Je e-mailadres wordt niet aan andere
                leden getoond.
              </p>
              <div className="flex flex-col gap-2">
                <input
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="Onderwerp"
                  maxLength={150}
                  className="w-full rounded-lg border border-input-border bg-background px-3 py-2 text-sm text-foreground focus:border-voc-red focus:outline-none focus:ring-2 focus:ring-voc-red/20"
                />
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Bericht"
                  rows={5}
                  maxLength={4000}
                  className="w-full rounded-lg border border-input-border bg-background px-3 py-2 text-sm text-foreground focus:border-voc-red focus:outline-none focus:ring-2 focus:ring-voc-red/20"
                />
              </div>
              {error && (
                <p role="alert" className="mt-2 text-xs text-voc-red-text">
                  {error}
                </p>
              )}
              <div className="mt-3 flex items-center gap-2">
                <button
                  type="button"
                  disabled={isPending}
                  onClick={handleSubmit}
                  className="rounded-full bg-voc-red px-3.5 py-1.5 text-sm font-medium text-white hover:bg-voc-red-dark disabled:opacity-60"
                >
                  {isPending ? "Versturen…" : "Verzenden"}
                </button>
                <button type="button" onClick={() => setOpen(false)} className="text-sm text-muted hover:underline">
                  Annuleren
                </button>
              </div>
            </div>
          </div>
        </FloatingPortal>
      )}
    </>
  );
}
