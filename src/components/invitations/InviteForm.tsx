"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { FieldError } from "@/components/ui/FieldError";
import { CompanySelector } from "@/components/company/CompanySelector";
import { createInvitationAction, type CreateInvitationState } from "@/app/(app)/beheer/uitnodigingen/actions";
import { useFieldValidation } from "@/lib/validation/useFieldValidation";
import { validateEmail } from "@/lib/validation/fields";

const initialState: CreateInvitationState = {};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Aanmaken…" : "Uitnodiging aanmaken"}
    </Button>
  );
}

export function InviteForm({ canInviteBoard }: { canInviteBoard: boolean }) {
  const [state, formAction] = useActionState(createInvitationAction, initialState);
  const { errors, validateField, validateAll } = useFieldValidation({
    email: (value) => validateEmail(value),
  });
  // UX-review punt 17: alleen e-mailadres invullen liet het registratie-
  // formulier later alsnog alles (naam, bedrijf) vragen, ook al stond dat
  // soms al bekend bij het bestuur. Optioneel gehouden — een snelle,
  // naamloze uitnodiging blijft mogelijk.
  const [withDetails, setWithDetails] = useState(false);

  return (
    <form
      action={formAction}
      onSubmit={(e) => {
        if (!validateAll(new FormData(e.currentTarget))) e.preventDefault();
      }}
      className="flex flex-col gap-3"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="flex-1">
          <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-foreground">
            E-mailadres (optioneel)
          </label>
          <Input
            id="email"
            name="email"
            type="text"
            inputMode="email"
            placeholder="naam@bedrijf.nl"
            invalid={Boolean(errors.email)}
            onBlur={(e) => validateField("email", e.target.value)}
          />
          <FieldError message={errors.email} />
        </div>

        {canInviteBoard && (
          <div>
            <label htmlFor="role" className="mb-1.5 block text-sm font-medium text-foreground">
              Rol
            </label>
            <Select id="role" name="role" defaultValue="lid" className="h-10 pl-3">
              <option value="lid">Lid</option>
              <option value="bestuurslid">Bestuurslid</option>
              <option value="beheerder">Beheerder</option>
            </Select>
          </div>
        )}

        <SubmitButton />
      </div>

      {!withDetails ? (
        <button
          type="button"
          onClick={() => setWithDetails(true)}
          className="self-start text-sm font-medium text-voc-red-text hover:underline"
        >
          Naam en bedrijf alvast invullen
        </button>
      ) : (
        <div className="flex flex-col gap-3 rounded-lg border border-border bg-background p-3">
          <div className="grid grid-cols-2 gap-3">
            <Input name="first_name" placeholder="Voornaam" />
            <Input name="last_name" placeholder="Achternaam" />
          </div>
          <CompanySelector />
        </div>
      )}

      {state.error && <p className="text-sm text-voc-red-text">{state.error}</p>}
      {state.success && state.emailSent && (
        <p className="text-sm text-green-600">Uitnodiging aangemaakt en per e-mail verstuurd.</p>
      )}
      {state.success && state.emailError && (
        <p className="text-sm text-voc-red-text">
          Uitnodiging aangemaakt, maar de e-mail versturen is niet gelukt ({state.emailError}). Deel de link
          hieronder zelf.
        </p>
      )}
      {state.success && !state.emailSent && !state.emailError && (
        <p className="text-sm text-green-600">Uitnodiging aangemaakt. Geen e-mailadres opgegeven — deel de link hieronder zelf.</p>
      )}
    </form>
  );
}
