"use client";

import { useTransition } from "react";
import Link from "next/link";
import { UserCircle, X } from "lucide-react";
import { dismissOnboardingAction } from "@/app/(app)/profiel/actions";

// UX-review punt 23: oorspronkelijk alleen de profielfoto (functie/bedrijf
// werden als altijd-al-ingevuld beschouwd, zie page.tsx) — blijkt niet te
// kloppen zodra de uitnodiging of de registratie zelf die velden leeg
// laat. Tekst past zich nu aan wat er daadwerkelijk ontbreekt, maar blijft
// hetzelfde kleine, wegklikbare regeltje zonder voortgangsbalk/checklist.
export function ProfilePhotoPrompt({
  missingPhoto,
  missingJobTitle,
  missingCompany,
  companyRequestPending,
}: {
  missingPhoto: boolean;
  missingJobTitle: boolean;
  missingCompany: boolean;
  companyRequestPending: boolean;
}) {
  const [isPending, startTransition] = useTransition();

  function handleDismiss() {
    startTransition(async () => {
      await dismissOnboardingAction();
    });
  }

  // Een al ingediende aanvraag telt niet mee als "nog toe te voegen" — anders
  // bleef deze prompt je net zo goed naar /profiel sturen als had je nog
  // niets gedaan, zonder dat zichtbaar was dat er al een aanvraag liep.
  const companyPendingOnly = missingCompany && companyRequestPending;
  const missing = [
    missingPhoto && "een profielfoto",
    missingJobTitle && "je functie",
    missingCompany && !companyRequestPending && "je bedrijf",
  ].filter((v): v is string => Boolean(v));

  let text: string;
  if (missing.length === 0) {
    text = companyPendingOnly ? "Bedrijf toevoegen is in behandeling" : "Vul je profiel aan";
  } else {
    const joined =
      missing.length > 1 ? `${missing.slice(0, -1).join(", ")} en ${missing[missing.length - 1]}` : missing[0];
    text = `Voeg ${joined} toe aan je profiel${companyPendingOnly ? " · bedrijf in behandeling" : ""}`;
  }

  return (
    <div className="animate-rise-in flex items-center justify-between gap-3 rounded-xl border border-border bg-surface px-3.5 py-2.5 text-sm shadow-sm">
      <Link href="/profiel" className="flex min-w-0 items-center gap-2 text-foreground hover:text-voc-red-text">
        <UserCircle size={15} className="shrink-0 text-voc-red-text" />
        <span className="truncate">{text}</span>
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
