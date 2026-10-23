"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { registerPublicForActivityAction, type PublicRegisterState } from "@/app/embed/agenda/actions";
import { buttonClassName } from "@/components/ui/Button";

const initialState: PublicRegisterState = {};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className={buttonClassName("primary", "md", "w-full")}>
      {pending ? "Bezig…" : "Aanmelden"}
    </button>
  );
}

function Field({
  id,
  label,
  type = "text",
}: {
  id: "name" | "company_name" | "email";
  label: string;
  type?: string;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-medium text-foreground">
        {label}
      </label>
      <input
        id={id}
        name={id}
        type={type}
        required
        className="rounded-lg border border-input-border bg-surface px-3 py-2 text-sm text-foreground placeholder:text-muted focus:border-petrol focus:outline-none focus:ring-2 focus:ring-petrol/20"
      />
    </div>
  );
}

// Embed-vormgeving-opdracht ("Aanmelden zonder account", addendum): een
// lid-zonder-account is geen bezoeker, dus geen gedeeld "bezoekers"-
// formulier meer. Twee heel verschillende formulieren onder dezelfde
// component:
//  - Leden-only activiteit (allowPublicRegistration false): alleen een
//    e-mailveld. Geen naam/bedrijfsnaam nodig -- bij een match vult de RPC
//    zelf de bekende naam/bedrijfsnaam van de uitnodiging in (0212).
//  - Open activiteit (allowPublicRegistration true): het volledige
//    naam/bedrijfsnaam/e-mail-formulier, voor leden-zonder-account en
//    niet-leden samen.
export function PublicRegistrationForm({
  activityId,
  allowPublicRegistration,
}: {
  activityId: string;
  allowPublicRegistration: boolean;
}) {
  const boundAction = registerPublicForActivityAction.bind(null, activityId);
  const [state, formAction] = useActionState(boundAction, initialState);

  if (state.success) {
    // Werking (addendum sectie 0): een exacte match op een bekend lid-adres
    // (profiel of uitnodiging) telt als lid en is dus "aangemeld" -- alleen
    // bij een uitnodiging (nog geen account) is er ook echt een account-
    // uitnodiging verstuurd, dus alleen dan die zin erbij. Een niet-lid in
    // een open activiteit is gewoon welkom, met een zachte verwijzing naar
    // info@ voor het geval het toch een lid was met een ander adres.
    if (state.personStatus === "lid") {
      return (
        <p className="rounded-xl border border-status-success/30 bg-status-success-soft px-4 py-3 text-sm text-status-success">
          {state.waitlisted
            ? "Je staat op de wachtlijst - we laten het weten zodra er een plek vrijkomt."
            : "Je bent aangemeld. Tot dan!"}
        </p>
      );
    }
    if (state.personStatus === "lid_zonder_account") {
      return (
        <p className="rounded-xl border border-status-success/30 bg-status-success-soft px-4 py-3 text-sm text-status-success">
          Je bent aangemeld. We hebben je op dit adres ook een uitnodiging gestuurd om een account te maken - dan hoef
          je dit de volgende keer niet meer in te vullen.
        </p>
      );
    }
    return (
      <div className="flex flex-col gap-2">
        <p className="rounded-xl border border-status-success/30 bg-status-success-soft px-4 py-3 text-sm text-status-success">
          Bedankt voor je aanmelding! Tot dan.
        </p>
        <p className="text-xs text-muted">
          Ben je lid maar herkennen we je niet? Dat kan aan je e-mailadres liggen - mail ons op info@vocveendam.nl.
        </p>
      </div>
    );
  }

  return (
    <form action={formAction} className="flex flex-col gap-3">
      {!allowPublicRegistration && (
        <p className="text-xs text-muted">
          Vul het e-mailadres in dat bij de VOC bekend is - meestal het adres waarop je ook de nieuwsbrief ontvangt.
        </p>
      )}
      {allowPublicRegistration && (
        <>
          <Field id="name" label="Naam" />
          <Field id="company_name" label="Bedrijfsnaam" />
        </>
      )}
      <Field id="email" label="E-mailadres" type="email" />
      {state.error && (
        <p role="alert" className="rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger-text">
          {state.error}
        </p>
      )}
      <SubmitButton />
    </form>
  );
}
