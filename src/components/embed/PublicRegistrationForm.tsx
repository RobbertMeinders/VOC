"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { registerPublicForActivityAction, type PublicRegisterState } from "@/app/embed/agenda/actions";

const initialState: PublicRegisterState = {};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full rounded-full bg-voc-red px-4 py-2.5 text-sm font-medium text-white hover:bg-voc-red/90 disabled:opacity-60"
    >
      {pending ? "Bezig…" : "Aanmelden"}
    </button>
  );
}

export function PublicRegistrationForm({ activityId }: { activityId: string }) {
  const boundAction = registerPublicForActivityAction.bind(null, activityId);
  const [state, formAction] = useActionState(boundAction, initialState);

  if (state.success) {
    // Personenmodel Fase 2: exacte e-mailmatch (match_person_by_email,
    // 0209) bepaalt een iets andere bedankttekst -- een al uitgenodigd
    // "lid zonder account" krijgt een seintje dat de uitnodiging net
    // nogmaals is verstuurd, i.p.v. de generieke tekst die een echte
    // buitenstaander ziet.
    const extra =
      state.personStatus === "lid_zonder_account"
        ? " Je hebt al een openstaande uitnodiging voor het ledenportaal -- we hebben die net opnieuw naar je gemaild."
        : "";
    return (
      <p className="rounded-xl border border-status-success/30 bg-status-success-soft px-4 py-3 text-sm text-status-success">
        Bedankt voor je aanmelding! Tot dan.{extra}
      </p>
    );
  }

  return (
    <form action={formAction} className="flex flex-col gap-3">
      <div className="flex flex-col gap-1.5">
        <label htmlFor="name" className="text-sm font-medium text-foreground">
          Naam
        </label>
        <input
          id="name"
          name="name"
          required
          className="rounded-lg border border-input-border bg-surface px-3 py-2 text-sm text-foreground placeholder:text-muted focus:border-petrol focus:outline-none focus:ring-2 focus:ring-petrol/20"
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="company_name" className="text-sm font-medium text-foreground">
          Bedrijfsnaam
        </label>
        <input
          id="company_name"
          name="company_name"
          required
          className="rounded-lg border border-input-border bg-surface px-3 py-2 text-sm text-foreground placeholder:text-muted focus:border-petrol focus:outline-none focus:ring-2 focus:ring-petrol/20"
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="email" className="text-sm font-medium text-foreground">
          E-mailadres
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          className="rounded-lg border border-input-border bg-surface px-3 py-2 text-sm text-foreground placeholder:text-muted focus:border-petrol focus:outline-none focus:ring-2 focus:ring-petrol/20"
        />
      </div>
      {state.error && (
        <p role="alert" className="rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger-text">
          {state.error}
        </p>
      )}
      <SubmitButton />
    </form>
  );
}
