"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { bootstrapRegisterAction, type BootstrapState } from "@/app/register/actions";

const initialState: BootstrapState = {};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" className="w-full" disabled={pending}>
      {pending ? "Account aanmaken…" : "Beheerdersaccount aanmaken"}
    </Button>
  );
}

export function BootstrapForm() {
  const [state, formAction] = useActionState(bootstrapRegisterAction, initialState);

  if (state.success) {
    return (
      <div className="rounded-lg bg-green-50 px-4 py-3 text-sm text-green-700 dark:bg-green-500/10 dark:text-green-400">
        {state.needsEmailConfirmation
          ? "Bijna klaar! Check je e-mail en klik op de bevestigingslink om je account te activeren."
          : "Account aangemaakt. Je wordt automatisch ingelogd…"}
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
        <label htmlFor="email" className="text-sm font-medium text-foreground">
          E-mailadres
        </label>
        <Input id="email" name="email" type="email" required autoComplete="email" />
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="password" className="text-sm font-medium text-foreground">
          Wachtwoord
        </label>
        <Input id="password" name="password" type="password" required autoComplete="new-password" minLength={8} />
        <p className="text-xs text-muted">Minimaal 8 tekens.</p>
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
