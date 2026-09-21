"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { createInvitationAction, type CreateInvitationState } from "@/app/(app)/beheer/uitnodigingen/actions";

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

  return (
    <form action={formAction} className="flex flex-col gap-3 sm:flex-row sm:items-end">
      <div className="flex-1">
        <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-foreground">
          E-mailadres (optioneel)
        </label>
        <Input id="email" name="email" type="email" placeholder="naam@bedrijf.nl" />
      </div>

      {canInviteBoard && (
        <div>
          <label htmlFor="role" className="mb-1.5 block text-sm font-medium text-foreground">
            Rol
          </label>
          <select
            id="role"
            name="role"
            defaultValue="lid"
            className="h-10 rounded-lg border border-border bg-surface px-3 text-sm text-foreground focus:border-voc-red focus:outline-none focus:ring-2 focus:ring-voc-red/20"
          >
            <option value="lid">Lid</option>
            <option value="bestuurslid">Bestuurslid</option>
            <option value="beheerder">Beheerder</option>
          </select>
        </div>
      )}

      <SubmitButton />

      {state.error && <p className="text-sm text-voc-red sm:basis-full">{state.error}</p>}
      {state.success && state.emailSent && (
        <p className="text-sm text-green-600 sm:basis-full">Uitnodiging aangemaakt en per e-mail verstuurd.</p>
      )}
      {state.success && state.emailError && (
        <p className="text-sm text-voc-red sm:basis-full">
          Uitnodiging aangemaakt, maar de e-mail versturen is niet gelukt ({state.emailError}). Deel de link
          hieronder zelf.
        </p>
      )}
      {state.success && !state.emailSent && !state.emailError && (
        <p className="text-sm text-green-600 sm:basis-full">
          Uitnodiging aangemaakt. Geen e-mailadres opgegeven — deel de link hieronder zelf.
        </p>
      )}
    </form>
  );
}
