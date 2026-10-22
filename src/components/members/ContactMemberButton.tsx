"use client";

import { useState, useTransition } from "react";
import { Send } from "lucide-react";
import { sendMemberContactMessageAction } from "@/app/(app)/leden/[id]/contact-actions";
import { useToast } from "@/lib/ui/ToastContext";

// VOC Hub — Veilige e-mailcontactfunctie: nadrukkelijk geen chat, alleen een
// eenmalig formulier dat server-side een e-mail verstuurt (zie
// contact-actions.ts) — geen conversatiegeschiedenis, geen inbox in de app.
//
// Staat in de contactgegevens-kaart (naast e-mail/telefoon) i.p.v. als losse
// knop bovenaan het profiel — dat hoort daar inhoudelijk bij, en klapt
// inline open i.p.v. een modal: voelt als onderdeel van die kaart in plaats
// van een los dialoogvenster.
export function ContactMemberButton({ recipientId, recipientName }: { recipientId: string; recipientName: string }) {
  const [open, setOpen] = useState(false);
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const toast = useToast();

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
    <div>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-foreground hover:bg-black/[.04] dark:hover:bg-white/[.06]"
      >
        <Send size={16} className="text-muted" />
        Neem contact op
      </button>

      {open && (
        <div className="animate-rise-in mt-1 flex flex-col gap-2 rounded-xl border border-border bg-background p-3">
          <p className="text-xs text-muted">
            {recipientName} ontvangt je bericht per e-mail en kan rechtstreeks op jou reageren. Je e-mailadres wordt niet aan andere
            leden getoond.
          </p>
          <input
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="Onderwerp"
            maxLength={150}
            className="w-full rounded-lg border border-input-border bg-surface px-3 py-2 text-sm text-foreground focus:border-petrol focus:outline-none focus:ring-2 focus:ring-petrol/20"
          />
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Bericht"
            rows={4}
            maxLength={4000}
            className="w-full rounded-lg border border-input-border bg-surface px-3 py-2 text-sm text-foreground focus:border-petrol focus:outline-none focus:ring-2 focus:ring-petrol/20"
          />
          {error && (
            <p role="alert" className="text-xs text-danger-text">
              {error}
            </p>
          )}
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={isPending}
              onClick={handleSubmit}
              className="rounded-full bg-voc-red px-3.5 py-1.5 text-sm font-medium text-white hover:bg-voc-red-dark disabled:opacity-60"
            >
              {isPending ? "Versturen…" : "Verzenden"}
            </button>
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                reset();
              }}
              className="text-sm text-muted hover:underline"
            >
              Annuleren
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
