"use client";

import { useState, useActionState } from "react";
import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { signInAction, signInWithMagicLinkAction, type LoginState, type MagicLinkState } from "@/app/login/actions";

const initialState: LoginState = {};
const initialMagicLinkState: MagicLinkState = {};

function SubmitButton({ children, pendingLabel }: { children: string; pendingLabel: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" className="w-full" disabled={pending}>
      {pending ? pendingLabel : children}
    </Button>
  );
}

function PasswordLoginForm({ redirectTo, onSwitch }: { redirectTo: string; onSwitch?: () => void }) {
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
      <label className="flex items-center gap-2 text-sm text-foreground">
        <input type="checkbox" name="remember" className="rounded" />
        Blijf ingelogd
      </label>
      {state.error && (
        <p role="alert" className="rounded-lg bg-voc-red-light px-3 py-2 text-sm text-voc-red-text">
          {state.error}
        </p>
      )}
      <SubmitButton pendingLabel="Bezig met inloggen…">Inloggen</SubmitButton>
      {onSwitch && (
        <button
          type="button"
          onClick={onSwitch}
          className="text-center text-sm font-medium text-voc-red-text hover:underline"
        >
          Inloggen zonder wachtwoord
        </button>
      )}
    </form>
  );
}

function MagicLinkLoginForm({ redirectTo, onSwitch }: { redirectTo: string; onSwitch: () => void }) {
  const [state, formAction] = useActionState(signInWithMagicLinkAction, initialMagicLinkState);

  if (state.submitted) {
    return (
      <div className="flex flex-col gap-4">
        <div className="rounded-lg bg-green-50 px-4 py-3 text-sm text-green-700 dark:bg-green-500/10 dark:text-green-400">
          Als dit e-mailadres bij ons bekend is, ontvang je binnen enkele minuten een inloglink. Geen
          wachtwoord nodig — klik de link in je mail en je bent binnen.
        </div>
        <button
          type="button"
          onClick={onSwitch}
          className="text-center text-sm font-medium text-voc-red-text hover:underline"
        >
          Terug naar inloggen met wachtwoord
        </button>
      </div>
    );
  }

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <input type="hidden" name="redirectTo" value={redirectTo} />
      <div className="flex flex-col gap-1.5">
        <label htmlFor="magic-email" className="text-sm font-medium text-foreground">
          E-mailadres
        </label>
        <Input
          id="magic-email"
          name="email"
          type="email"
          autoComplete="email"
          required
          placeholder="naam@bedrijf.nl"
        />
        <p className="text-xs text-muted">We sturen je een inloglink — geen wachtwoord nodig.</p>
      </div>
      <label className="flex items-center gap-2 text-sm text-foreground">
        <input type="checkbox" name="remember" className="rounded" defaultChecked />
        Blijf ingelogd
      </label>
      {state.error && (
        <p role="alert" className="rounded-lg bg-voc-red-light px-3 py-2 text-sm text-voc-red-text">
          {state.error}
        </p>
      )}
      <SubmitButton pendingLabel="Bezig met versturen…">Stuur inloglink</SubmitButton>
      <button
        type="button"
        onClick={onSwitch}
        className="text-center text-sm font-medium text-voc-red-text hover:underline"
      >
        Inloggen met wachtwoord
      </button>
    </form>
  );
}

export function LoginForm({ redirectTo, magicLinkEnabled }: { redirectTo: string; magicLinkEnabled: boolean }) {
  const [mode, setMode] = useState<"password" | "magic-link">("password");

  // Zolang mail niet geconfigureerd is (zie isEmailConfigured) kan de
  // inloglink-mail nooit verzonden worden — de knop om te wisselen staat dan
  // niet eens, in plaats van een "we hebben een mail gestuurd"-melding te
  // tonen voor een mail die nooit komt.
  if (!magicLinkEnabled) {
    return <PasswordLoginForm redirectTo={redirectTo} />;
  }

  return mode === "password" ? (
    <PasswordLoginForm redirectTo={redirectTo} onSwitch={() => setMode("magic-link")} />
  ) : (
    <MagicLinkLoginForm redirectTo={redirectTo} onSwitch={() => setMode("password")} />
  );
}
