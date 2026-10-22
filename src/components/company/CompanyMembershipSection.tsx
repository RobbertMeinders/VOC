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

// Lidmaatschap Deel 1 + feedback-ronde 2 (punt 13 + aanvulling): staat nu op
// het BEWERKFORMULIER van het bedrijf (bewerken/page.tsx), op de plek waar
// eerder "Bedrijf verwijderen" stond — geen eigen opvallende kaart met
// titel meer (dat oogde te prominent), gewoon een rustige sectie onderaan.
// "Lid sinds" is alleen een jaartal (geen volledige datum); de kolom zelf
// (member_since) blijft een `date` — 1 januari van het ingevulde jaar.
export function CompanyMembershipSection({
  companyId,
  membershipStatus,
  memberSince,
  membershipEndDate,
  isPrimaryContact,
  isBoard,
}: {
  companyId: string;
  membershipStatus: string;
  memberSince: string | null;
  membershipEndDate: string | null;
  isPrimaryContact: boolean;
  isBoard: boolean;
}) {
  const [isPending, startTransition] = useTransition();
  const [yearValue, setYearValue] = useState(memberSince ? memberSince.slice(0, 4) : "");
  const [showCancelForm, setShowCancelForm] = useState(false);
  const [endDate, setEndDate] = useState("");
  const [minEndDate] = useState(() => new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 10));
  const confirm = useConfirm();
  const toast = useToast();
  const currentYear = new Date().getFullYear();

  function saveYear(value: string) {
    setYearValue(value);
    const year = Number(value);
    const isValidYear = value === "" || (Number.isInteger(year) && year >= 1900 && year <= currentYear);
    if (!isValidYear) return;

    startTransition(async () => {
      const result = await updateCompanyMemberSinceAction(companyId, value ? `${value}-01-01` : null);
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
    <div className="flex flex-col gap-3 border-t border-border pt-4">
      <div className="flex flex-col gap-1.5">
        <label htmlFor={`member-since-${companyId}`} className="text-xs font-medium text-muted">
          Lid sinds (jaartal, optioneel)
        </label>
        <Input
          id={`member-since-${companyId}`}
          type="number"
          inputMode="numeric"
          min={1900}
          max={currentYear}
          placeholder="bv. 2018"
          value={yearValue}
          onChange={(e) => saveYear(e.target.value)}
          disabled={isPending}
          className="h-9 w-28"
        />
      </div>

      {membershipStatus === "opgezegd" && membershipEndDate && (
        <p className="rounded-lg bg-status-warning-soft px-3 py-2 text-xs text-status-warning">
          Lidmaatschap opgezegd — loopt tot {new Date(membershipEndDate).toLocaleDateString("nl-NL")}.
        </p>
      )}

      {membershipStatus === "lid" && membershipEndDate && (
        <p className="rounded-lg bg-status-warning-soft px-3 py-2 text-xs text-status-warning">
          Opzegging gestart, einddatum {new Date(membershipEndDate).toLocaleDateString("nl-NL")} — wacht nog op bevestiging via e-mail.
        </p>
      )}

      {membershipStatus === "lid" && (isPrimaryContact || isBoard) && !showCancelForm && (
        <button type="button" onClick={() => setShowCancelForm(true)} className="self-start text-xs font-medium text-muted hover:text-danger-text hover:underline">
          Lidmaatschap opzeggen
        </button>
      )}

      {showCancelForm && (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
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
              className="rounded-full border border-danger-text px-3.5 py-1.5 text-xs font-medium text-danger-text hover:bg-danger-soft disabled:opacity-60"
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
