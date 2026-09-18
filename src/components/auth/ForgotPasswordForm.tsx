"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { requestPasswordResetAction, type ForgotPasswordState } from "@/app/wachtwoord-vergeten/actions";

const initialState: ForgotPasswordState = {};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" className="w-full" disabled={pending}>
      {pending ? "Bezig…" : "Verstuur resetlink"}
    </Button>
  );
}

export function ForgotPasswordForm() {
  const [state, formAction] = useActionState(requestPasswordResetAction, initialState);

  if (state.submitted) {
    return (
      <div className="rounded-lg bg-green-50 px-4 py-3 text-sm text-green-700 dark:bg-green-500/10 dark:text-green-400">
        Als dit e-mailadres bij ons bekend is, ontvang je binnen enkele minuten een link om je
        wachtwoord opnieuw in te stellen.
      </div>
    );
  }

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <label htmlFor="email" className="text-sm font-medium text-foreground">
          E-mailadres
        </label>
        <Input id="email" name="email" type="email" autoComplete="email" required placeholder="naam@bedrijf.nl" />
      </div>
      <SubmitButton />
    </form>
  );
}
