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
      <div className="rounded-lg bg-green-50 px-4 py-3 text-sm text-green-700 dark:bg-green-500/10 dark:text-green-400">
        Bedankt! Het bestuur beoordeelt je aanvraag en stuurt je een uitnodigingslink als je in
        aanmerking komt.
      </div>
    );
  }

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="first_name" className="text-sm font-medium text-foreground">
            Voornaam
          </label>
          <Input id="first_name" name="first_name" required autoComplete="given-name" />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="last_name" className="text-sm font-medium text-foreground">
            Achternaam
          </label>
          <Input id="last_name" name="last_name" required autoComplete="family-name" />
        </div>
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="company_name" className="text-sm font-medium text-foreground">
          Bedrijfsnaam
        </label>
        <Input id="company_name" name="company_name" autoComplete="organization" />
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="address" className="text-sm font-medium text-foreground">
          Adres
        </label>
        <Input id="address" name="address" autoComplete="street-address" />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="postal_code" className="text-sm font-medium text-foreground">
            Postcode
          </label>
          <Input id="postal_code" name="postal_code" autoComplete="postal-code" />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="city" className="text-sm font-medium text-foreground">
            Plaatsnaam
          </label>
          <Input id="city" name="city" autoComplete="address-level2" />
        </div>
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="email" className="text-sm font-medium text-foreground">
          E-mailadres
        </label>
        <Input id="email" name="email" type="email" required autoComplete="email" placeholder="naam@bedrijf.nl" />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="phone" className="text-sm font-medium text-foreground">
            Telefoonnummer
          </label>
          <Input id="phone" name="phone" type="tel" autoComplete="tel" />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="job_title" className="text-sm font-medium text-foreground">
            Functie
          </label>
          <Input id="job_title" name="job_title" autoComplete="organization-title" />
        </div>
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="website" className="text-sm font-medium text-foreground">
          Website
        </label>
        <Input id="website" name="website" type="url" autoComplete="url" placeholder="https://" />
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="message" className="text-sm font-medium text-foreground">
          Toelichting (optioneel)
        </label>
        <textarea
          id="message"
          name="message"
          rows={3}
          className="rounded-lg border border-input-border bg-surface px-3 py-2 text-sm text-foreground placeholder:text-muted focus:border-voc-red focus:outline-none focus:ring-2 focus:ring-voc-red/20"
          placeholder="Bijvoorbeeld: waarom je graag lid wilt worden"
        />
      </div>
      <label className="flex items-start gap-2 text-sm text-foreground">
        <input type="checkbox" name="consent" required className="mt-0.5 rounded" />
        <span>
          Door dit formulier in te dienen doe ik een lidmaatschapsaanvraag bij de Veendammer OndernemersCompagnie en
          geef ik toestemming voor het bewaren van mijn gegevens ten behoeve van de beoordeling van mijn aanvraag.
        </span>
      </label>
      {state.error && (
        <p role="alert" className="rounded-lg bg-voc-red-light px-3 py-2 text-sm text-voc-red-text">
          {state.error}
        </p>
      )}
      <SubmitButton />
    </form>
  );
}
