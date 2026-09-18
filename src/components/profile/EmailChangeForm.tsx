"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { changeEmailAction, type ChangeEmailState } from "@/app/(app)/profiel/actions";

const initialState: ChangeEmailState = {};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant="secondary" size="sm" disabled={pending}>
      {pending ? "Versturen…" : "Bevestigingslink versturen"}
    </Button>
  );
}

export function EmailChangeForm({ currentEmail }: { currentEmail: string }) {
  const [state, formAction] = useActionState(changeEmailAction, initialState);
  const [open, setOpen] = useState(false);

  if (state.success) {
    return (
      <p className="rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700 dark:bg-green-500/10 dark:text-green-400">
        Check je nieuwe (en huidige) e-mailadres voor een bevestigingslink — pas na bevestigen wijzigt je e-mailadres echt.
      </p>
    );
  }

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="text-sm font-medium text-voc-red hover:underline">
        E-mailadres wijzigen
      </button>
    );
  }

  return (
    <form action={formAction} className="flex flex-col gap-2 rounded-lg border border-border p-3">
      <label htmlFor="new_email" className="text-sm font-medium text-foreground">
        Nieuw e-mailadres
      </label>
      <Input id="new_email" name="email" type="email" defaultValue={currentEmail} required autoComplete="email" />
      {state.error && (
        <p role="alert" className="rounded-lg bg-voc-red-light px-3 py-2 text-sm text-voc-red">
          {state.error}
        </p>
      )}
      <div className="flex items-center gap-2">
        <SubmitButton />
        <button type="button" onClick={() => setOpen(false)} className="text-sm text-muted hover:underline">
          Annuleren
        </button>
      </div>
    </form>
  );
}
