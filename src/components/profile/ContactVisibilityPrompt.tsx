"use client";

import { useTransition } from "react";
import Link from "next/link";
import { updateShowEmailAction, updateShowPhoneAction, dismissContactVisibilityPromptAction } from "@/app/(app)/profiel/actions";

// Lidmaatschap-traject Deel 3: privacy ging standaard op "verborgen" —
// deze prompt biedt een rustige, uitstelbare weg terug naar zichtbaar, i.p.v.
// dat iedereen het zelf in Instellingen moet gaan opzoeken. Los van de
// bestaande dunne rise-in-regeltjes (ProfilePhotoPrompt/IntroductionPrompt):
// twee volwaardige knoppen i.p.v. één klikbare tekstregel, dus een eigen,
// iets grotere kaart. Bewust NIET op de (eerste-login) welkomstdialoog.
export function ContactVisibilityPrompt({ email, phone }: { email: string | null; phone: string | null }) {
  const [isPending, startTransition] = useTransition();

  function handleShow() {
    startTransition(async () => {
      await Promise.all([updateShowEmailAction(true), updateShowPhoneAction(true)]);
    });
  }

  function handleDismiss() {
    startTransition(async () => {
      await dismissContactVisibilityPromptAction();
    });
  }

  const currentValues = phone ? `${email} · ${phone}` : email;

  return (
    // Tablet-fix (768px): bij sm:flex-row (640px) past de knoppen-/linkregel
    // (shrink-0) niet meer naast de tekst zodra de desktop-zijbalk (md:flex,
    // 288px) het contentgebied versmalt — pas vanaf lg (1024px), zelfde
    // breedte waarop de zijbalk elders ook pas als "ruim genoeg" geldt, naast
    // elkaar i.p.v. gestapeld.
    <div className="animate-rise-in flex flex-col gap-3 rounded-2xl bg-surface p-4 shadow-sm lg:flex-row lg:items-center lg:justify-between">
      <p className="text-sm text-foreground">
        Andere leden zien je e-mail en telefoonnummer nu niet. Een bericht sturen kan altijd. Mogen ze je gegevens
        wel zien?
      </p>
      <div className="flex shrink-0 flex-col items-start gap-2 lg:items-end">
        <div className="flex gap-2">
          <button
            type="button"
            onClick={handleShow}
            disabled={isPending}
            className="rounded-full bg-petrol px-3.5 py-1.5 text-xs font-medium text-white hover:opacity-90 disabled:opacity-60"
          >
            Maak zichtbaar
          </button>
          <button
            type="button"
            onClick={handleDismiss}
            disabled={isPending}
            className="rounded-full border border-border px-3.5 py-1.5 text-xs font-medium text-foreground hover:border-muted disabled:opacity-60"
          >
            Niet nu
          </button>
        </div>
        <Link href="/profiel" className="text-xs text-muted hover:text-petrol hover:underline">
          Kloppen je gegevens niet? {currentValues} - wijzig ze hier.
        </Link>
      </div>
    </div>
  );
}
