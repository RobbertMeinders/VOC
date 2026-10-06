"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { setPasswordAction, type SetPasswordState } from "@/app/wachtwoord-instellen/actions";

const initialState: SetPasswordState = {};

function SubmitButton({ disabled }: { disabled?: boolean }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" className="w-full" disabled={pending || disabled}>
      {pending ? "Bezig…" : "Wachtwoord instellen"}
    </Button>
  );
}

export function SetPasswordForm() {
  const [state, formAction] = useActionState(setPasswordAction, initialState);
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [passwordRepeat, setPasswordRepeat] = useState("");
  const mismatch = passwordRepeat.length > 0 && password !== passwordRepeat;

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
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <p className="text-xs text-muted">Minimaal 8 tekens.</p>
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="password_repeat" className="text-sm font-medium text-foreground">
          Herhaal wachtwoord
        </label>
        <Input
          id="password_repeat"
          name="password_repeat"
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
          value={passwordRepeat}
          onChange={(e) => setPasswordRepeat(e.target.value)}
        />
        {mismatch && <p className="text-xs text-voc-red">De wachtwoorden komen niet overeen.</p>}
      </div>
      {state.error && (
        <p role="alert" className="rounded-lg bg-voc-red-light px-3 py-2 text-sm text-voc-red">
          {state.error}
        </p>
      )}
      <SubmitButton disabled={mismatch} />
      <Link href="/instellingen" className="text-center text-sm font-medium text-voc-red hover:underline">
        Annuleren
      </Link>
    </form>
  );
}
