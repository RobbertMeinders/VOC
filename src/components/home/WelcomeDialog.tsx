"use client";

import { useEffect, useId, useState, useTransition } from "react";
import Link from "next/link";
import { X } from "lucide-react";
import { FloatingPortal } from "@/components/ui/FloatingPortal";
import { Button } from "@/components/ui/Button";
import { useEscapeKey } from "@/lib/dom/useEscapeKey";
import { useBodyScrollLock } from "@/lib/dom/useBodyScrollLock";
import { useFocusTrap } from "@/lib/dom/useFocusTrap";
import { dismissWelcomeDialogAction } from "@/app/(app)/profiel/actions";

// B (onboarding-opdracht): eerste-login dialoog — toont precies één keer
// (shouldShow komt van Home, bepaald op welcome_dialog_dismissed_at), met
// letterlijk de aangeleverde tekst. Zelfde modal-opzet als
// ConfirmDialogContext (fixed overlay + gecentreerde kaart), maar hier als
// losstaand component i.p.v. via die gedeelde context: dit is een eenmalige
// server-bepaalde weergave, geen herbruikbare bevestigingsvraag.
// Sessievlag i.p.v. alleen op de servervlag vertrouwen: gaat het opslaan
// mis (netwerkfout, of de kolom ontbreekt nog omdat migratie 0066 niet is
// uitgevoerd), dan zou shouldShow bij elke paginalading weer true blijven
// en de dialoog telkens terugkomen — met deze vlag blijft hij in elk geval
// dicht voor de rest van de sessie.
const DISMISS_SESSION_KEY = "voc-welcome-dialog-dismissed";
// Polish-ronde: niet meteen bij het laden tonen, zodat de Home eerst rustig
// in beeld komt.
const SHOW_DELAY_MS = 2500;

export function WelcomeDialog({ shouldShow }: { shouldShow: boolean }) {
  const [dismissed, setDismissed] = useState(() => {
    if (typeof window === "undefined") return false;
    try {
      return sessionStorage.getItem(DISMISS_SESSION_KEY) === "1";
    } catch {
      return false;
    }
  });
  const [delayElapsed, setDelayElapsed] = useState(false);
  const [isPending, startTransition] = useTransition();
  const open = shouldShow && !dismissed && delayElapsed;

  useEffect(() => {
    if (!shouldShow || dismissed) return;
    const timer = setTimeout(() => setDelayElapsed(true), SHOW_DELAY_MS);
    return () => clearTimeout(timer);
  }, [shouldShow, dismissed]);

  function handleDismiss() {
    setDismissed(true);
    try {
      sessionStorage.setItem(DISMISS_SESSION_KEY, "1");
    } catch {
      // Privémodus o.i.d.: dan geldt alleen het servervlag nog.
    }
    startTransition(async () => {
      try {
        const result = await dismissWelcomeDialogAction();
        if (result?.error) {
          console.error("Welkomstdialoog wegklikken niet opgeslagen:", result.error);
        }
      } catch (error) {
        console.error("Welkomstdialoog wegklikken niet opgeslagen:", error);
      }
    });
  }

  useEscapeKey(open, handleDismiss);
  useBodyScrollLock(open);
  const trapRef = useFocusTrap(open);
  const titleId = useId();

  if (!open) return null;

  return (
    <FloatingPortal>
      <div className="animate-fade-in fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={handleDismiss}>
        <div
          ref={trapRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          tabIndex={-1}
          className="animate-scale-in relative w-full max-w-sm rounded-2xl bg-surface p-6 pt-8 text-center shadow-lg focus:outline-none"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            type="button"
            onClick={handleDismiss}
            aria-label="Sluiten"
            className="absolute right-3 top-3 flex h-7 w-7 items-center justify-center rounded-full text-muted hover:bg-black/[.04] hover:text-foreground dark:hover:bg-white/[.08]"
          >
            <X size={16} />
          </button>
          <p id={titleId} className="text-xs font-bold uppercase tracking-wide text-voc-red-text">
            Proefversie
          </p>
          <p className="mt-2 text-sm text-muted">
            Je gebruikt de proefversie van het ledenportaal. Bijna alles werkt al, maar het kan zijn dat er nog
            fouten in zitten. Loop je ergens tegenaan? Laat het ons weten.
          </p>
          <div className="mt-5 flex justify-center">
            <Button type="button" size="sm" disabled={isPending} onClick={handleDismiss}>
              Aan de slag
            </Button>
          </div>
          <Link
            href="/testfase"
            onClick={handleDismiss}
            className="mt-3 inline-block text-sm font-medium text-petrol hover:underline"
          >
            Meer over de proefversie
          </Link>
        </div>
      </div>
    </FloatingPortal>
  );
}
