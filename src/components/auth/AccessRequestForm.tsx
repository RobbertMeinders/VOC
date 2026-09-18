"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { submitAccessRequestAction, type AccessRequestState } from "@/app/toegang-aanvragen/actions";

const initialState: AccessRequestState = {};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" className="w-full" disabled={pending}>
      {pending ? "Versturen…" : "Aanvraag versturen"}
    </Button>
  );
}

export function AccessRequestForm() {
  const [state, formAction] = useActionState(submitAccessRequestAction, initialState);

  if (state.success) {
    return (
      <div className="rounded-lg bg-voc-red-light px-4 py-3 text-sm text-voc-red">
        Bedankt! Het bestuur beoordeelt je aanvraag en stuurt je een uitnodigingslink als je in
        aanmerking komt.
      </div>
    );
  }

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <label htmlFor="name" className="text-sm font-medium text-foreground">
          Naam
        </label>
        <Input id="name" name="name" required autoComplete="name" />
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="email" className="text-sm font-medium text-foreground">
          E-mailadres
        </label>
        <Input id="email" name="email" type="email" required autoComplete="email" placeholder="naam@bedrijf.nl" />
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="message" className="text-sm font-medium text-foreground">
          Toelichting (optioneel)
        </label>
        <textarea
          id="message"
          name="message"
          rows={3}
          className="rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground placeholder:text-muted focus:border-voc-red focus:outline-none focus:ring-2 focus:ring-voc-red/20"
          placeholder="Bijvoorbeeld: bij welk bedrijf je werkt"
        />
      </div>
      {state.error && (
        <p role="alert" className="rounded-lg bg-voc-red-light px-3 py-2 text-sm text-voc-red">
          {state.error}
        </p>
      )}
      <SubmitButton />
    </form>
  );
}
