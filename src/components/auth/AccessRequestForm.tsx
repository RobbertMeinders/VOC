"use client";

import { useActionState, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import { Camera } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { FieldError } from "@/components/ui/FieldError";
import { FormErrorSummary } from "@/components/ui/FormErrorSummary";
import { submitAccessRequestAction, type AccessRequestState } from "@/app/toegang-aanvragen/actions";
import { useFieldValidation } from "@/lib/validation/useFieldValidation";
import { validateEmail, validateUrl, normalizeUrl } from "@/lib/validation/fields";
import { compressInputFile, createThumbnailFile } from "@/lib/image/compress";
import { Textarea } from "@/components/ui/Textarea";

const initialState: AccessRequestState = {};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" className="w-full" disabled={pending}>
      {pending ? "Versturen…" : "Aanvraag versturen"}
    </Button>
  );
}

export function AccessRequestForm() {
  const [state, formAction] = useActionState(submitAccessRequestAction, initialState);
  const { errors, validateField, validateAll } = useFieldValidation({
    email: (value) => validateEmail(value, true),
    website: (value) => validateUrl(value),
  });
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const logoThumbInputRef = useRef<HTMLInputElement>(null);

  if (state.success) {
    return (
      <div className="rounded-lg bg-status-success-soft px-4 py-3 text-sm text-status-success">
        Bedankt! Je aanvraag voor het lidmaatschap wordt beoordeeld binnen het bestuur. Kom je in
        aanmerking, dan ontvang je een bevestiging met de volgende stappen.
      </div>
    );
  }

  return (
    <form
      action={formAction}
      onSubmit={(e) => {
        if (!validateAll(new FormData(e.currentTarget))) e.preventDefault();
      }}
      className="flex flex-col gap-4"
    >
      <FormErrorSummary errors={errors} />
      {/* Honeypot: voor mensen onzichtbaar (niet via Tab bereikbaar, niet
          voorgelezen), een scriptje dat elk veld invult tikt hem wel aan.
          Gevuld -> submitAccessRequestAction doet alsof het gelukt is,
          zonder iets op te slaan. */}
      <input
        type="text"
        name="company_fax"
        tabIndex={-1}
        autoComplete="off"
        aria-hidden="true"
        className="sr-only"
      />
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
        <label htmlFor="company_name" className="text-sm font-medium text-foreground">
          Bedrijfsnaam
        </label>
        <Input id="company_name" name="company_name" autoComplete="organization" />
      </div>
      <div className="flex items-center gap-3">
        <div className="relative flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-dashed border-input-border bg-surface">
          {logoPreview ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={logoPreview} alt="" className="h-full w-full object-contain" />
          ) : (
            <Camera size={18} className="text-muted" />
          )}
          <label
            htmlFor="logo"
            className="absolute -bottom-1 -right-1 flex h-6 w-6 cursor-pointer items-center justify-center rounded-full bg-petrol text-white shadow-sm hover:opacity-90"
          >
            <Camera size={12} />
          </label>
          <input
            id="logo"
            name="logo"
            type="file"
            accept="image/png,image/jpeg,image/webp,image/avif"
            className="sr-only"
            onChange={async (e) => {
              const input = e.target;
              const compressed = await compressInputFile(input);
              if (!compressed) return;
              setLogoPreview(URL.createObjectURL(compressed));

              const thumbInput = logoThumbInputRef.current;
              if (thumbInput) {
                const thumb = await createThumbnailFile(compressed);
                const transfer = new DataTransfer();
                if (thumb) transfer.items.add(thumb);
                thumbInput.files = transfer.files;
              }
            }}
          />
          <input ref={logoThumbInputRef} type="file" name="logo_thumb" className="hidden" tabIndex={-1} aria-hidden="true" />
        </div>
        <p className="text-xs text-muted">
          Nieuw bedrijf? Stuur het logo meteen mee, dan staat het al klaar zodra je account geactiveerd wordt.
        </p>
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="address" className="text-sm font-medium text-foreground">
          Adres
        </label>
        <Input id="address" name="address" autoComplete="street-address" />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="postal_code" className="text-sm font-medium text-foreground">
            Postcode
          </label>
          <Input id="postal_code" name="postal_code" autoComplete="postal-code" />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="city" className="text-sm font-medium text-foreground">
            Plaatsnaam
          </label>
          <Input id="city" name="city" autoComplete="address-level2" />
        </div>
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="email" className="text-sm font-medium text-foreground">
          E-mailadres
        </label>
        <Input
          id="email"
          name="email"
          type="text"
          inputMode="email"
          autoComplete="email"
          placeholder="naam@bedrijf.nl"
          invalid={Boolean(errors.email)}
          aria-describedby={errors.email ? "email-error" : undefined}
          onBlur={(e) => validateField("email", e.target.value)}
        />
        <FieldError id="email-error" message={errors.email} />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="phone" className="text-sm font-medium text-foreground">
            Telefoonnummer
          </label>
          <Input id="phone" name="phone" type="tel" autoComplete="tel" />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="job_title" className="text-sm font-medium text-foreground">
            Functie
          </label>
          <Input id="job_title" name="job_title" autoComplete="organization-title" />
        </div>
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="website" className="text-sm font-medium text-foreground">
          Website
        </label>
        <Input
          id="website"
          name="website"
          type="text"
          inputMode="url"
          autoComplete="url"
          placeholder="https://"
          invalid={Boolean(errors.website)}
          aria-describedby={errors.website ? "website-error" : undefined}
          onBlur={(e) => {
            e.target.value = normalizeUrl(e.target.value);
            validateField("website", e.target.value);
          }}
        />
        <FieldError id="website-error" message={errors.website} />
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="message" className="text-sm font-medium text-foreground">
          Toelichting (optioneel)
        </label>
        <Textarea
          id="message"
          name="message"
          rows={3}
          placeholder="Bijvoorbeeld: waarom je graag lid wilt worden"
        />
      </div>
      <label className="flex items-start gap-2 text-sm text-foreground">
        <input type="checkbox" name="consent" required className="mt-0.5 rounded" />
        <span>
          Door dit formulier in te dienen doe ik een lidmaatschapsaanvraag bij de Veendammer Ondernemers Compagnie en
          geef ik toestemming voor het bewaren van mijn gegevens ten behoeve van de beoordeling van mijn aanvraag.
        </span>
      </label>
      {state.error && (
        <p role="alert" className="rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger-text">
          {state.error}
        </p>
      )}
      <SubmitButton />
    </form>
  );
}
