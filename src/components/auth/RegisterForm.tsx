"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { CompanySelector } from "@/components/company/CompanySelector";
import { registerAction, type RegisterState, type CompanyOption } from "@/app/register/[token]/actions";

const initialState: RegisterState = {};

export type RegisterPrefill = {
  firstName: string | null;
  lastName: string | null;
  phone: string | null;
  jobTitle: string | null;
  company: CompanyOption | null;
};

function SubmitButton({ disabled }: { disabled?: boolean }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" className="w-full" disabled={pending || disabled}>
      {pending ? "Account activeren…" : "Account activeren"}
    </Button>
  );
}

export function RegisterForm({
  token,
  prefilledEmail,
  prefilled,
}: {
  token: string;
  prefilledEmail: string | null;
  prefilled?: RegisterPrefill;
}) {
  const registerWithToken = registerAction.bind(null, token);
  const [state, formAction] = useActionState(registerWithToken, initialState);
  const [password, setPassword] = useState("");
  const [passwordRepeat, setPasswordRepeat] = useState("");
  const mismatch = passwordRepeat.length > 0 && password !== passwordRepeat;

  return (
    <form action={formAction} className="flex flex-col gap-5">
      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="first_name" className="text-sm font-medium text-foreground">
            Voornaam
          </label>
          <Input
            id="first_name"
            name="first_name"
            required
            autoComplete="given-name"
            defaultValue={prefilled?.firstName ?? undefined}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="last_name" className="text-sm font-medium text-foreground">
            Achternaam
          </label>
          <Input
            id="last_name"
            name="last_name"
            required
            autoComplete="family-name"
            defaultValue={prefilled?.lastName ?? undefined}
          />
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="email" className="text-sm font-medium text-foreground">
          E-mailadres
        </label>
        <Input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="email"
          defaultValue={prefilledEmail ?? undefined}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="job_title" className="text-sm font-medium text-foreground">
            Functie
          </label>
          <Input
            id="job_title"
            name="job_title"
            autoComplete="organization-title"
            defaultValue={prefilled?.jobTitle ?? undefined}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="phone" className="text-sm font-medium text-foreground">
            Telefoonnummer
          </label>
          <Input id="phone" name="phone" type="tel" autoComplete="tel" defaultValue={prefilled?.phone ?? undefined} />
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <span className="text-sm font-medium text-foreground">Bedrijf</span>
        <CompanySelector initialSelected={prefilled?.company ?? null} />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="password" className="text-sm font-medium text-foreground">
            Wachtwoord
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
          {mismatch && <p className="text-xs text-voc-red-text">Komt niet overeen.</p>}
        </div>
      </div>

      {state.error && (
        <p role="alert" className="rounded-lg bg-voc-red-light px-3 py-2 text-sm text-voc-red-text">
          {state.error}
        </p>
      )}

      <SubmitButton disabled={mismatch} />
    </form>
  );
}
