"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Sparkles } from "lucide-react";
import { FloatingPortal } from "@/components/ui/FloatingPortal";
import { Button } from "@/components/ui/Button";
import { useEscapeKey } from "@/lib/dom/useEscapeKey";
import { useBodyScrollLock } from "@/lib/dom/useBodyScrollLock";
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

export function WelcomeDialog({ shouldShow }: { shouldShow: boolean }) {
  const [dismissed, setDismissed] = useState(() => {
    if (typeof window === "undefined") return false;
    try {
      return sessionStorage.getItem(DISMISS_SESSION_KEY) === "1";
    } catch {
      return false;
    }
  });
  const [isPending, startTransition] = useTransition();
  const open = shouldShow && !dismissed;

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

  if (!open) return null;

  return (
    <FloatingPortal>
      <div className="animate-fade-in fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={handleDismiss}>
        <div className="animate-scale-in w-full max-w-sm rounded-2xl bg-surface p-6 shadow-lg" onClick={(e) => e.stopPropagation()}>
          <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-petrol-soft text-petrol">
            <Sparkles size={20} />
          </div>
          <h2 className="font-display text-xl font-extrabold tracking-[-0.02em] text-foreground">Je bent een van de eersten</h2>
          <p className="mt-2 text-sm text-muted">
            Je gebruikt de proefversie van het ledenportaal. Je kunt alles al gebruiken, maar soms hapert er nog iets.
            Loop je ergens tegenaan? Gebruik Feedback geven.
          </p>
          <div className="mt-5 flex items-center justify-between gap-3">
            <Link href="/testfase" onClick={handleDismiss} className="text-sm font-medium text-petrol hover:underline">
              Meer over de proefversie
            </Link>
            <Button type="button" size="sm" disabled={isPending} onClick={handleDismiss}>
              Aan de slag
            </Button>
          </div>
        </div>
      </div>
    </FloatingPortal>
  );
}
