"use client";

import { useActionState, useEffect, useState } from "react";
import { useFormStatus } from "react-dom";
import { UserPlus } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { inviteColleagueAction, type InviteColleagueState } from "@/app/(app)/bedrijven/[id]/actions";
import { useToast } from "@/lib/ui/ToastContext";

const initialState: InviteColleagueState = {};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="sm" disabled={pending}>
      {pending ? "Uitnodigen…" : "Uitnodigen"}
    </Button>
  );
}

// Automatische berichten, uitnodiging-in-drieën: tot nu toe kon alleen
// bestuur/beheer iemand uitnodigen — een collega uitnodigen vanuit je eigen
// bedrijf bestond nog niet. Zelfde zichtbaarheidsgate als CompanyMembership-
// Requests ernaast (canManage: bestuur/beheer of een actief lid van dit
// bedrijf).
//
// UX-review feedback-ronde 2 punt 14: een teller met een richtlijn van 2
// accounts per bedrijf — bewust GEEN harde limiet (sommige bedrijven hebben
// er al 6), alleen een zachte hint die oplicht als het er al meer dan 2 zijn.
const SOFT_ACCOUNT_GUIDELINE = 2;

export function InviteColleagueForm({ companyId, memberCount }: { companyId: string; memberCount: number }) {
  const [open, setOpen] = useState(false);
  const toast = useToast();
  const [state, formAction] = useActionState(inviteColleagueAction.bind(null, companyId), initialState);

  // Geen setOpen(false) in een effect op state.success (React-compiler
  // purity-regel, zie TestfaseFeedbackForm voor hetzelfde patroon): in
  // plaats van na succes automatisch weer in te klappen, toont dit gewoon
  // een "verstuurd"-bevestiging met een handmatige sluitknop.
  useEffect(() => {
    if (state.success) toast("Uitnodiging verstuurd.");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  const overGuideline = memberCount > SOFT_ACCOUNT_GUIDELINE;
  const accountCountLabel = `${memberCount} ${memberCount === 1 ? "account" : "accounts"} gekoppeld`;

  if (!open) {
    return (
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="flex items-center gap-1.5 text-sm font-medium text-petrol hover:underline"
        >
          <UserPlus size={15} />
          Collega uitnodigen
        </button>
        <span className={overGuideline ? "text-xs font-medium text-status-warning" : "text-xs text-muted"}>
          {accountCountLabel}
        </span>
      </div>
    );
  }

  if (state.success) {
    return (
      <div className="flex items-center justify-between gap-3 rounded-2xl bg-surface p-4 shadow-sm">
        <p className="text-sm text-foreground">Uitnodiging verstuurd.</p>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="text-sm font-medium text-petrol hover:underline"
        >
          Sluiten
        </button>
      </div>
    );
  }

  return (
    <form action={formAction} className="rounded-2xl bg-surface p-4 shadow-sm">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-sm font-semibold text-foreground">Collega uitnodigen voor het ledenportaal</h2>
        <span className={overGuideline ? "text-xs font-medium text-status-warning" : "text-xs text-muted"}>
          {accountCountLabel}
        </span>
      </div>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="flex-1">
          <label htmlFor="colleague-email" className="mb-1.5 block text-sm font-medium text-foreground">
            E-mailadres
          </label>
          <Input id="colleague-email" name="email" type="email" required placeholder="collega@bedrijf.nl" />
        </div>
        <div className="flex-1">
          <label htmlFor="colleague-first-name" className="mb-1.5 block text-sm font-medium text-foreground">
            Voornaam (optioneel)
          </label>
          <Input id="colleague-first-name" name="first_name" />
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <SubmitButton />
          <button type="button" onClick={() => setOpen(false)} className="text-sm text-muted hover:underline">
            Annuleren
          </button>
        </div>
      </div>
      {state.error && (
        <p role="alert" className="mt-2 text-sm text-danger-text">
          {state.error}
        </p>
      )}
    </form>
  );
}
