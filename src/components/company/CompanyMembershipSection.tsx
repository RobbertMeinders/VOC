"use client";

import { useState, useTransition } from "react";
import {
  updateCompanyMemberSinceAction,
  requestCompanyCancellationAction,
  boardCancelCompanyMembershipAction,
} from "@/app/(app)/bedrijven/[id]/actions";
import { useConfirm } from "@/lib/ui/ConfirmDialogContext";
import { useToast } from "@/lib/ui/ToastContext";
import { Input } from "@/components/ui/Input";

// Lidmaatschap Deel 1: "lid sinds" (elk lid van het bedrijf mag dit zelf
// invullen) + de opzegknop. Bewust een eigen kaart, los van CompanyHeader —
// membership_status is een beheer-begrip en dit raakt alleen wie het
// bedrijf zelf kan beheren (canManage) of het primaire contact/bestuur is;
// de term "primair contact" zelf blijft nergens zichtbaar in de tekst.
export function CompanyMembershipSection({
  companyId,
  membershipStatus,
  memberSince,
  membershipEndDate,
  canManage,
  isPrimaryContact,
  isBoard,
}: {
  companyId: string;
  membershipStatus: string;
  memberSince: string | null;
  membershipEndDate: string | null;
  canManage: boolean;
  isPrimaryContact: boolean;
  isBoard: boolean;
}) {
  const [isPending, startTransition] = useTransition();
  const [memberSinceValue, setMemberSinceValue] = useState(memberSince ?? "");
  const [showCancelForm, setShowCancelForm] = useState(false);
  const [endDate, setEndDate] = useState("");
  const [minEndDate] = useState(() => new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 10));
  const confirm = useConfirm();
  const toast = useToast();

  if (!canManage) return null;

  function saveMemberSince(value: string) {
    setMemberSinceValue(value);
    startTransition(async () => {
      const result = await updateCompanyMemberSinceAction(companyId, value || null);
      if (result.error) {
        toast(result.error);
      } else {
        toast("Opgeslagen.");
      }
    });
  }

  async function handleCancelSubmit() {
    if (!endDate) return;
    const confirmed = await confirm({
      title: "Lidmaatschap opzeggen?",
      description: isBoard
        ? `Het lidmaatschap wordt direct bevestigd opgezegd per ${new Date(endDate).toLocaleDateString("nl-NL")}. Tot die datum blijft toegang bestaan; daarna worden gekoppelde accounts ingetrokken.`
        : `Je ontvangt een bevestigingsmail. Na bevestigen loopt het lidmaatschap tot ${new Date(endDate).toLocaleDateString("nl-NL")}; daarna wordt je account (en die van collega's bij dit bedrijf) ingetrokken.`,
      confirmLabel: "Opzeggen",
      danger: true,
    });
    if (!confirmed) return;

    startTransition(async () => {
      const result = isBoard
        ? await boardCancelCompanyMembershipAction(companyId, endDate)
        : await requestCompanyCancellationAction(companyId, endDate);
      if (result.error) {
        toast(result.error);
      } else {
        toast(isBoard ? "Lidmaatschap opgezegd." : "Bevestigingsmail verstuurd.");
        setShowCancelForm(false);
      }
    });
  }

  return (
    <div className="rounded-2xl bg-surface p-6 shadow-sm">
      <h2 className="mb-3 text-sm font-semibold text-foreground">Lidmaatschap</h2>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex flex-col gap-1.5">
          <label htmlFor={`member-since-${companyId}`} className="text-xs font-medium text-muted">
            Lid sinds (optioneel)
          </label>
          <Input
            id={`member-since-${companyId}`}
            type="date"
            value={memberSinceValue}
            onChange={(e) => saveMemberSince(e.target.value)}
            disabled={isPending}
            className="h-9 w-full sm:w-44"
          />
        </div>

        {membershipStatus === "lid" && (isPrimaryContact || isBoard) && !showCancelForm && (
          <button
            type="button"
            onClick={() => setShowCancelForm(true)}
            className="text-sm font-medium text-danger-text hover:underline"
          >
            Lidmaatschap opzeggen
          </button>
        )}
      </div>

      {membershipStatus === "opgezegd" && membershipEndDate && (
        <p className="mt-4 rounded-lg bg-status-warning-soft px-3 py-2 text-sm text-status-warning">
          Lidmaatschap opgezegd — loopt tot {new Date(membershipEndDate).toLocaleDateString("nl-NL")}.
        </p>
      )}

      {membershipStatus === "lid" && membershipEndDate && (
        <p className="mt-4 rounded-lg bg-status-warning-soft px-3 py-2 text-sm text-status-warning">
          Opzegging gestart, einddatum {new Date(membershipEndDate).toLocaleDateString("nl-NL")} — wacht nog op bevestiging via e-mail.
        </p>
      )}

      {showCancelForm && (
        <div className="mt-4 flex flex-col gap-3 border-t border-border pt-4 sm:flex-row sm:items-end">
          <div className="flex flex-col gap-1.5">
            <label htmlFor={`cancel-date-${companyId}`} className="text-xs font-medium text-foreground">
              Einddatum lidmaatschap
            </label>
            <Input
              id={`cancel-date-${companyId}`}
              type="date"
              min={minEndDate}
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="h-9 w-full sm:w-44"
            />
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleCancelSubmit}
              disabled={!endDate || isPending}
              className="rounded-full bg-voc-red px-3.5 py-1.5 text-xs font-medium text-white hover:bg-voc-red-dark disabled:opacity-60"
            >
              {isPending ? "Bezig…" : "Bevestigen"}
            </button>
            <button
              type="button"
              onClick={() => setShowCancelForm(false)}
              className="rounded-full border border-border px-3.5 py-1.5 text-xs font-medium text-foreground hover:border-muted"
            >
              Annuleren
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
