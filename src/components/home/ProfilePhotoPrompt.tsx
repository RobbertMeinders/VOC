"use client";

import { useTransition } from "react";
import Link from "next/link";
import { Camera, X } from "lucide-react";
import { dismissOnboardingAction } from "@/app/(app)/profiel/actions";

// UX-review U1, bijgesteld op gebruikersfeedback: functie en bedrijf staan
// al bij registratie in het formulier (geprefilled vanuit de uitnodiging —
// zie register/[token]/page.tsx), dus die als losse onboarding-stappen
// tonen was altijd al afgevinkt en dus zinloos. Pushmeldingen werken nog
// niet overal (niet elk toestel/browser, en soms nog geen VAPID-config),
// dus geen stap die een lid kan "mislukken". Blijft over: alleen een
// profielfoto is iets wat een nieuw lid na registratie nog mist — als klein,
// wegklikbaar regeltje i.p.v. een volledige checklist met voortgangsbalk.
export function ProfilePhotoPrompt() {
  const [isPending, startTransition] = useTransition();

  function handleDismiss() {
    startTransition(async () => {
      await dismissOnboardingAction();
    });
  }

  return (
    <div className="animate-rise-in flex items-center justify-between gap-3 rounded-xl border border-border bg-surface px-3.5 py-2.5 text-sm shadow-sm">
      <Link href="/profiel" className="flex min-w-0 items-center gap-2 text-foreground hover:text-voc-red-text">
        <Camera size={15} className="shrink-0 text-voc-red-text" />
        <span className="truncate">Voeg een profielfoto toe, zodat andere leden je herkennen</span>
      </Link>
      <button
        type="button"
        onClick={handleDismiss}
        disabled={isPending}
        aria-label="Wegklikken"
        className="shrink-0 rounded-full p-1 text-muted hover:bg-black/[.04] hover:text-foreground disabled:opacity-50 dark:hover:bg-white/[.08]"
      >
        <X size={14} />
      </button>
    </div>
  );
}
