"use client";

import { useTransition } from "react";
import Link from "next/link";
import { updateCompanyShowAddressAction, dismissCompanyAddressPromptAction } from "@/app/(app)/bedrijven/[id]/actions";
import { companyHref } from "@/lib/company/slug";

// Lidmaatschap-traject Deel 3: zelfde rustige, uitstelbare opt-in-aanpak als
// ContactVisibilityPrompt (profiel), maar voor het bezoekersadres van het
// bedrijf. Alleen getoond aan wie het bedrijf kan beheren (canManage) — zie
// CompanyProfileContent.
export function AddressVisibilityPrompt({
  companyId,
  companySlug,
  message = "Andere leden zien je bedrijfsadres nu niet, en het staat niet op de kaart. Mogen ze het wel zien?",
}: {
  companyId: string;
  companySlug: string;
  message?: string;
}) {
  const [isPending, startTransition] = useTransition();

  function handleShow() {
    startTransition(async () => {
      await updateCompanyShowAddressAction(companyId, true);
    });
  }

  function handleDismiss() {
    startTransition(async () => {
      await dismissCompanyAddressPromptAction(companyId);
    });
  }

  return (
    <div className="flex flex-col gap-3 rounded-2xl bg-surface p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
      <p className="text-sm text-foreground">{message}</p>
      <div className="flex shrink-0 flex-col items-start gap-2 sm:items-end">
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
        <Link href={`${companyHref({ slug: companySlug })}/bewerken`} className="text-xs text-muted hover:text-petrol hover:underline">
          Kloppen je gegevens niet? Wijzig ze hier.
        </Link>
      </div>
    </div>
  );
}
