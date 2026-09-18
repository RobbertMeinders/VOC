"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { signInAction, type LoginState } from "@/app/login/actions";

const initialState: LoginState = {};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" className="w-full" disabled={pending}>
      {pending ? "Bezig met inloggen…" : "Inloggen"}
    </Button>
  );
}

export function LoginForm({ redirectTo }: { redirectTo: string }) {
  const [state, formAction] = useActionState(signInAction, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <input type="hidden" name="redirectTo" value={redirectTo} />
      <div className="flex flex-col gap-1.5">
        <label htmlFor="email" className="text-sm font-medium text-foreground">
          E-mailadres
        </label>
        <Input id="email" name="email" type="email" autoComplete="email" required placeholder="naam@bedrijf.nl" />
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="password" className="text-sm font-medium text-foreground">
          Wachtwoord
        </label>
        <Input id="password" name="password" type="password" autoComplete="current-password" required />
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
