"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Check, X } from "lucide-react";
import { clsx } from "clsx";
import { decideCompanyMembershipRequestAction } from "@/app/(app)/bedrijven/[id]/actions";
import { useConfirmWithReason } from "@/lib/ui/ConfirmDialogContext";
import { useToast } from "@/lib/ui/ToastContext";
import { memberHref } from "@/lib/members/slug";
import { companyHref } from "@/lib/company/slug";
import { formatDateNumeric } from "@/lib/format/date";

export type CompanyMembershipRequestItem = {
  id: string;
  requestedAt: string;
  decidedAt: string | null;
  decisionReason: string | null;
  decidedBy: { first_name: string; last_name: string } | null;
  company: { id: string; slug: string; name: string };
  profile: { id: string; slug: string; first_name: string; last_name: string };
};

// Opdracht "koppelverzoeken onder Aanvragen": zelfde outcome-prop-patroon als
// AccessRequestRow (F3) — één rijcomponent voor zowel de openstaande als de
// afgehandelde lijst, zodat beide overzichten (Beheer -> Aanvragen ->
// Bedrijfskoppelingen) één patroon volgen.
export function CompanyMembershipRequestRow({
  request,
  outcome,
}: {
  request: CompanyMembershipRequestItem;
  outcome?: "approved" | "rejected";
}) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const confirmWithReason = useConfirmWithReason();
  const showToast = useToast();

  if (done) return null;

  function decide(decision: "approved" | "rejected", reason?: string) {
    setError(null);
    startTransition(async () => {
      const result = await decideCompanyMembershipRequestAction(request.id, request.company.id, decision, reason);
      if (result.error) {
        setError(result.error);
        return;
      }
      showToast(
        decision === "approved"
          ? `${request.profile.first_name} is gekoppeld aan ${request.company.name}.`
          : `Koppelverzoek van ${request.profile.first_name} afgewezen.`
      );
      setDone(true);
    });
  }

  async function handleReject() {
    const { confirmed, reason } = await confirmWithReason({
      title: `Koppelverzoek van ${request.profile.first_name} afwijzen?`,
      description: "Dit meldt de aanvrager dat het verzoek is afgewezen, met de reden hieronder als je die invult.",
      confirmLabel: "Afwijzen",
      reasonLabel: "Reden (optioneel)",
      reasonPlaceholder: "Bijvoorbeeld: niet bij dit bedrijf werkzaam…",
      danger: true,
    });
    if (confirmed) decide("rejected", reason || undefined);
  }

  return (
    // Live QA: flex-wrap liet de knoppen bij een lange regel onder de tekst
    // belanden en bij een korte regel ernaast — nu altijd knoppen rechts
    // vanaf sm, en altijd gestapeld op mobiel (zelfde patroon als
    // BeheerBedrijvenListClient's rijen).
    <div className="flex flex-col gap-3 border-b border-border py-3 last:border-0 sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0 flex-1">
        <p className="text-sm text-foreground">
          <Link href={memberHref(request.profile)} className="font-medium hover:text-petrol hover:underline">
            {request.profile.first_name} {request.profile.last_name}
          </Link>{" "}
          wil gekoppeld worden aan{" "}
          <Link href={companyHref(request.company)} className="font-medium hover:text-petrol hover:underline">
            {request.company.name}
          </Link>
        </p>
        <p className="mt-0.5 text-xs text-muted">Aangevraagd op {formatDateNumeric(request.requestedAt)}</p>
        {!outcome && (
          <p className="mt-1 text-xs text-muted">
            Na goedkeuring staat {request.profile.first_name} bij dit bedrijf en kan deze persoon het bedrijfsprofiel bewerken.
          </p>
        )}
        {outcome && (
          <p className="mt-1 text-xs text-muted">
            {outcome === "approved" ? "Goedgekeurd" : "Afgewezen"}
            {request.decidedAt && ` op ${formatDateNumeric(request.decidedAt)}`}
            {request.decidedBy && ` door ${request.decidedBy.first_name} ${request.decidedBy.last_name}`}
            {request.decisionReason && ` · Reden: ${request.decisionReason}`}
          </p>
        )}
        {error && <p className="mt-1.5 text-xs text-voc-red-text">{error}</p>}
      </div>
      {outcome ? (
        <span
          className={clsx(
            "flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium",
            outcome === "approved" ? "bg-status-success-soft text-status-success" : "bg-raised text-muted"
          )}
        >
          {outcome === "approved" ? <Check size={14} /> : <X size={14} />}
          {outcome === "approved" ? "Goedgekeurd" : "Afgewezen"}
        </span>
      ) : (
        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            disabled={isPending}
            onClick={() => decide("approved")}
            className="flex items-center gap-1.5 rounded-full bg-voc-red px-3 py-1.5 text-xs font-medium text-white hover:bg-voc-red-dark disabled:opacity-60"
          >
            <Check size={14} />
            Goedkeuren
          </button>
          <button
            type="button"
            disabled={isPending}
            onClick={handleReject}
            className="flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-xs font-medium text-foreground hover:border-danger hover:text-danger-text disabled:opacity-60"
          >
            <X size={14} />
            Afwijzen
          </button>
        </div>
      )}
    </div>
  );
}
