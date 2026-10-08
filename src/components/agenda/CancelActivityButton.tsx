"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Ban, X } from "lucide-react";
import { cancelActivityAction } from "@/app/(app)/agenda/actions";
import { FloatingPortal } from "@/components/ui/FloatingPortal";
import { useEscapeKey } from "@/lib/dom/useEscapeKey";
import { useBodyScrollLock } from "@/lib/dom/useBodyScrollLock";

// UX-review punt 1/21: vervangt Verwijderen zodra een activiteit
// aanmeldingen heeft — die blijven zo bestaan en de aangemelden krijgen een
// gerichte melding, i.p.v. dat verwijderen ze stilzwijgend meeneemt. Een
// modal (i.p.v. inline uitklappen) omdat de knop zowel op de detailpagina
// als in een smalle beheerrij staat — een inline paneel zou die rij kapot
// duwen.
export function CancelActivityButton({
  activityId,
  activityTitle,
  className,
}: {
  activityId: string;
  activityTitle: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState(`"${activityTitle}" is afgelast.`);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  useEscapeKey(open, () => setOpen(false));
  useBodyScrollLock(open);

  return (
    <>
      <button
        type="button"
        title="Afgelasten"
        aria-label="Afgelasten"
        onClick={() => setOpen(true)}
        className={
          className ?? "flex items-center gap-1.5 rounded-full border border-border bg-surface px-3 py-1.5 text-sm font-medium text-voc-red-text hover:border-voc-red"
        }
      >
        <Ban size={14} />
        {!className && "Afgelasten"}
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
                <h2 className="text-sm font-semibold text-foreground">Activiteit afgelasten?</h2>
                <button type="button" onClick={() => setOpen(false)} aria-label="Sluiten" className="text-muted hover:text-foreground">
                  <X size={16} />
                </button>
              </div>
              <p className="mb-3 text-xs text-muted">
                Alle aangemelden (leden en niet-leden) krijgen hieronder meteen een melding. De activiteit blijft
                zichtbaar als &ldquo;Afgelast&rdquo; en kan niet meer geboekt worden.
              </p>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={3}
                className="mb-2 w-full rounded-lg border border-input-border bg-background px-3 py-2 text-sm text-foreground focus:border-voc-red focus:outline-none focus:ring-2 focus:ring-voc-red/20"
              />
              {error && <p className="mb-2 text-xs text-voc-red-text">{error}</p>}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={isPending}
                  onClick={() =>
                    startTransition(async () => {
                      const result = await cancelActivityAction(activityId, message);
                      if (result.error) {
                        setError(result.error);
                        return;
                      }
                      setOpen(false);
                      router.refresh();
                    })
                  }
                  className="rounded-full bg-voc-red px-3.5 py-1.5 text-sm font-medium text-white hover:bg-voc-red-dark disabled:opacity-60"
                >
                  {isPending ? "Bezig…" : "Afgelasten en informeren"}
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
