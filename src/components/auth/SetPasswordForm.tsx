"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { setPasswordAction, type SetPasswordState } from "@/app/wachtwoord-instellen/actions";

const initialState: SetPasswordState = {};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" className="w-full" disabled={pending}>
      {pending ? "Bezig…" : "Wachtwoord instellen"}
    </Button>
  );
}

export function SetPasswordForm() {
  const [state, formAction] = useActionState(setPasswordAction, initialState);
  const router = useRouter();

  useEffect(() => {
    if (state.success) {
      const timeout = setTimeout(() => router.push("/"), 1500);
      return () => clearTimeout(timeout);
    }
  }, [state.success, router]);

  if (state.success) {
    return (
      <div className="rounded-lg bg-green-50 px-4 py-3 text-sm text-green-700 dark:bg-green-500/10 dark:text-green-400">
        Wachtwoord ingesteld. Je wordt doorgestuurd…
      </div>
    );
  }

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <label htmlFor="password" className="text-sm font-medium text-foreground">
          Nieuw wachtwoord
        </label>
        <Input id="password" name="password" type="password" autoComplete="new-password" required minLength={8} />
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
