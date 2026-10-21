"use client";

import { useActionState, useEffect } from "react";
import { useFormStatus } from "react-dom";
import Link from "next/link";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { quickUpdateCompanyAction, type QuickUpdateCompanyState } from "@/app/(app)/bedrijven/[id]/actions";
import { useToast } from "@/lib/ui/ToastContext";
import { INDUSTRIES } from "@/lib/constants/industries";
import { companyHref } from "@/lib/company/slug";

const initialState: QuickUpdateCompanyState = {};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-full bg-voc-red px-3.5 py-1.5 text-xs font-medium text-white hover:bg-voc-red-dark disabled:opacity-60"
    >
      {pending ? "Opslaan…" : "Opslaan"}
    </button>
  );
}

// Inline formulier in Beheer -> Bedrijven -> Overzicht: alleen de velden die
// in de rij zelf al zichtbaar zijn (naam/branche/plaats/telefoon/e-mail/
// website) en die je als bestuur/beheer het vaakst even snel bijwerkt,
// zonder naar de volledige bewerkpagina te hoeven — adres, logo, omschrijving,
// socials en factuurgegevens blijven daar (link onderaan dit paneel).
export function CompanyQuickEditForm({
  companyId,
  companySlug,
  name,
  industry,
  city,
  phone,
  email,
  website,
  onSaved,
}: {
  companyId: string;
  companySlug: string;
  name: string;
  industry: string | null;
  city: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  onSaved: () => void;
}) {
  const updateWithId = quickUpdateCompanyAction.bind(null, companyId);
  const [state, formAction] = useActionState(updateWithId, initialState);
  const toast = useToast();

  useEffect(() => {
    if (state.success) {
      toast("Opgeslagen.");
      onSaved();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  return (
    <form action={formAction} className="mt-3 flex flex-col gap-3 border-t border-border pt-3">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <label htmlFor={`qe-name-${companyId}`} className="text-xs font-medium text-foreground">
            Bedrijfsnaam
          </label>
          <Input id={`qe-name-${companyId}`} name="name" defaultValue={name} required className="h-9" />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor={`qe-industry-${companyId}`} className="text-xs font-medium text-foreground">
            Branche
          </label>
          <Select id={`qe-industry-${companyId}`} name="industry" defaultValue={industry ?? ""} className="h-9 pl-3">
            <option value="">Geen branche</option>
            {INDUSTRIES.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </Select>
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor={`qe-city-${companyId}`} className="text-xs font-medium text-foreground">
            Plaats
          </label>
          <Input id={`qe-city-${companyId}`} name="city" defaultValue={city ?? ""} className="h-9" />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor={`qe-phone-${companyId}`} className="text-xs font-medium text-foreground">
            Telefoon
          </label>
          <Input id={`qe-phone-${companyId}`} name="phone" type="tel" defaultValue={phone ?? ""} className="h-9" />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor={`qe-email-${companyId}`} className="text-xs font-medium text-foreground">
            E-mailadres
          </label>
          <Input id={`qe-email-${companyId}`} name="email" type="email" defaultValue={email ?? ""} className="h-9" />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor={`qe-website-${companyId}`} className="text-xs font-medium text-foreground">
            Website
          </label>
          <Input id={`qe-website-${companyId}`} name="website" defaultValue={website ?? ""} className="h-9" />
        </div>
      </div>

      {state.error && (
        <p role="alert" className="rounded-lg bg-voc-red-light px-3 py-2 text-xs text-voc-red-text">
          {state.error}
        </p>
      )}

      <div className="flex items-center justify-end gap-3">
        <Link href={companyHref({ slug: companySlug }, "/bewerken")} className="text-xs font-medium text-voc-red-text hover:underline">
          Meer bewerken
        </Link>
        <SubmitButton />
      </div>
    </form>
  );
}
