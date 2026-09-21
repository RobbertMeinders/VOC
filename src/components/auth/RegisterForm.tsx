"use client";

import { useActionState } from "react";
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

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" className="w-full" disabled={pending}>
      {pending ? "Account aanmaken…" : "Account aanmaken"}
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

  if (state.success) {
    return (
      <div className="rounded-lg bg-green-50 px-4 py-3 text-sm text-green-700 dark:bg-green-500/10 dark:text-green-400">
        {state.needsEmailConfirmation
          ? "Bijna klaar! Check je e-mail en klik op de bevestigingslink om je account te activeren."
          : "Je account is aangemaakt. Je wordt automatisch ingelogd…"}
      </div>
    );
  }

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

      <div className="flex flex-col gap-1.5">
        <label htmlFor="password" className="text-sm font-medium text-foreground">
          Wachtwoord
        </label>
        <Input id="password" name="password" type="password" required autoComplete="new-password" minLength={8} />
        <p className="text-xs text-muted">Minimaal 8 tekens.</p>
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

      {state.error && (
        <p role="alert" className="rounded-lg bg-voc-red-light px-3 py-2 text-sm text-voc-red">
          {state.error}
        </p>
      )}

      <SubmitButton />
    </form>
  );
}
