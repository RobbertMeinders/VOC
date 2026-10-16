"use client";

import { useActionState, useEffect, useState } from "react";
import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Switch } from "@/components/ui/Switch";
import { FieldError } from "@/components/ui/FieldError";
import { FormErrorSummary } from "@/components/ui/FormErrorSummary";
import { FormSection, FormSections, FormToggleRow } from "@/components/ui/FormSection";
import { updateCompanyBillingAction, type UpdateCompanyBillingState } from "@/app/(app)/bedrijven/[id]/actions";
import { useToast } from "@/lib/ui/ToastContext";
import { useFieldValidation } from "@/lib/validation/useFieldValidation";
import { validateEmail } from "@/lib/validation/fields";
import type { Database } from "@/lib/types/database";

type Company = Database["public"]["Tables"]["companies"]["Row"];
type CompanyBillingDetails = Database["public"]["Tables"]["company_billing_details"]["Row"];

const initialState: UpdateCompanyBillingState = {};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Opslaan…" : "Opslaan"}
    </Button>
  );
}

// Los van CompanyForm (en diens updateCompanyAction): andere tabel
// (company_billing_details), dus een eigen formulier/actie i.p.v. alles in
// één mega-formulier te proppen.
export function CompanyBillingForm({ company, billing }: { company: Company; billing: CompanyBillingDetails | null }) {
  const updateWithId = updateCompanyBillingAction.bind(null, company.id);
  const [state, formAction] = useActionState(updateWithId, initialState);
  const toast = useToast();
  const { errors, validateField, validateAll } = useFieldValidation({
    invoice_email: (value) => validateEmail(value),
  });

  // Default true (ook als er nog geen rij bestaat) — zie 0083_company_
  // billing_details.sql: dat is het standaardgedrag totdat een bedrijf
  // bewust een afwijkend factuuradres invult.
  const [sameAsVisitAddress, setSameAsVisitAddress] = useState(billing?.same_as_visit_address ?? true);

  useEffect(() => {
    if (state.success) toast("Opgeslagen.");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  const visitAddressLine = [company.address, [company.postal_code, company.city].filter(Boolean).join(" ")]
    .filter(Boolean)
    .join(", ");

  return (
    <form
      action={formAction}
      onSubmit={(e) => {
        if (!validateAll(new FormData(e.currentTarget))) e.preventDefault();
      }}
      className="flex flex-col gap-5"
    >
      <FormErrorSummary errors={errors} />

      <FormSections>
        <FormSection label="Factuuradres">
          <FormToggleRow label="Factuuradres is hetzelfde als bezoekadres">
            <input type="hidden" name="same_as_visit_address" value={sameAsVisitAddress ? "on" : ""} />
            <Switch
              checked={sameAsVisitAddress}
              onChange={() => setSameAsVisitAddress((v) => !v)}
              label="Factuuradres is hetzelfde als bezoekadres"
            />
          </FormToggleRow>

          {sameAsVisitAddress ? (
            <p className="rounded-lg bg-black/[.03] px-3 py-2 text-sm text-muted dark:bg-white/[.04]">
              {visitAddressLine || "Nog geen bezoekadres ingevuld - vul dat eerst bij de bedrijfsgegevens in."}
            </p>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="invoice_address" className="text-sm font-medium text-foreground">
                    Adres
                  </label>
                  <Input
                    id="invoice_address"
                    name="invoice_address"
                    defaultValue={billing?.invoice_address ?? ""}
                    placeholder="Straatnaam 1"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="invoice_postal_code" className="text-sm font-medium text-foreground">
                    Postcode
                  </label>
                  <Input
                    id="invoice_postal_code"
                    name="invoice_postal_code"
                    defaultValue={billing?.invoice_postal_code ?? ""}
                    placeholder="9640 AB"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="invoice_city" className="text-sm font-medium text-foreground">
                    Plaats
                  </label>
                  <Input id="invoice_city" name="invoice_city" defaultValue={billing?.invoice_city ?? ""} />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="invoice_country" className="text-sm font-medium text-foreground">
                    Land
                  </label>
                  <Input id="invoice_country" name="invoice_country" defaultValue={billing?.invoice_country ?? "Nederland"} />
                </div>
              </div>
            </>
          )}
        </FormSection>

        <FormSection label="Naam en btw">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="invoice_name" className="text-sm font-medium text-foreground">
              Factuurnaam
            </label>
            <Input id="invoice_name" name="invoice_name" defaultValue={billing?.invoice_name ?? ""} placeholder={company.name} />
            <p className="text-xs text-muted">Alleen invullen als facturen op een andere naam moeten komen.</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="vat_number" className="text-sm font-medium text-foreground">
                Btw-nummer
              </label>
              <Input id="vat_number" name="vat_number" defaultValue={billing?.vat_number ?? ""} placeholder="NL000000000B00" />
              <p className="text-xs text-muted">Optioneel.</p>
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="invoice_email" className="text-sm font-medium text-foreground">
                Factuur-e-mailadres
              </label>
              <Input
                id="invoice_email"
                name="invoice_email"
                type="text"
                inputMode="email"
                defaultValue={billing?.invoice_email ?? ""}
                placeholder={company.email ?? "facturen@bedrijf.nl"}
                invalid={Boolean(errors.invoice_email)}
                onBlur={(e) => validateField("invoice_email", e.target.value)}
              />
              <FieldError message={errors.invoice_email} />
              <p className="text-xs text-muted">Alleen als dit afwijkt van het algemene e-mailadres.</p>
            </div>
          </div>
        </FormSection>
      </FormSections>

      {state.error && (
        <p role="alert" className="rounded-lg bg-voc-red-light px-3 py-2 text-sm text-voc-red-text">
          {state.error}
        </p>
      )}
      <div>
        <SubmitButton />
      </div>
    </form>
  );
}
