"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { Camera } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { CompanyLogo } from "./CompanyLogo";
import { updateCompanyAction, type UpdateCompanyState } from "@/app/(app)/bedrijven/[id]/actions";
import { compressInputFile } from "@/lib/image/compress";
import { INDUSTRIES } from "@/lib/constants/industries";
import type { Database } from "@/lib/types/database";

type Company = Database["public"]["Tables"]["companies"]["Row"];

const initialState: UpdateCompanyState = {};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Opslaan…" : "Opslaan"}
    </Button>
  );
}

export function CompanyForm({ company, logoUrl }: { company: Company; logoUrl: string | null }) {
  const updateWithId = updateCompanyAction.bind(null, company.id);
  const [state, formAction] = useActionState(updateWithId, initialState);
  const [preview, setPreview] = useState<string | null>(null);
  const shownLogo = preview ?? logoUrl;

  return (
    <form action={formAction} className="flex flex-col gap-5">
      <div className="flex items-center gap-4">
        <div className="relative">
          <CompanyLogo logoUrl={shownLogo} name={company.name} size={72} />
          <label
            htmlFor="logo"
            className="absolute -bottom-1 -right-1 flex h-7 w-7 cursor-pointer items-center justify-center rounded-full bg-voc-red text-white shadow-sm hover:bg-voc-red-dark"
          >
            <Camera size={14} />
          </label>
          <input
            id="logo"
            name="logo"
            type="file"
            accept="image/png,image/jpeg,image/webp"
            className="sr-only"
            onChange={async (e) => {
              const input = e.target;
              const compressed = await compressInputFile(input);
              if (compressed) setPreview(URL.createObjectURL(compressed));
            }}
          />
        </div>
        <p className="text-xs text-muted">Klik op het camera-icoon om een logo te uploaden.</p>
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="name" className="text-sm font-medium text-foreground">
          Bedrijfsnaam
        </label>
        <Input id="name" name="name" defaultValue={company.name} required />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="tagline" className="text-sm font-medium text-foreground">
          Tagline
        </label>
        <Input
          id="tagline"
          name="tagline"
          defaultValue={company.tagline ?? ""}
          placeholder="Korte pakkende omschrijving in een paar woorden"
          maxLength={120}
        />
        <p className="text-xs text-muted">Wordt getoond op de bedrijfspagina en in het overzicht.</p>
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="description" className="text-sm font-medium text-foreground">
          Biografie
        </label>
        <textarea
          id="description"
          name="description"
          rows={5}
          defaultValue={company.description ?? ""}
          placeholder="Meer over het bedrijf: geschiedenis, aanbod, waar jullie voor staan..."
          className="rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground placeholder:text-muted focus:border-voc-red focus:outline-none focus:ring-2 focus:ring-voc-red/20"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="industry" className="text-sm font-medium text-foreground">
            Branche
          </label>
          <select
            id="industry"
            name="industry"
            defaultValue={company.industry ?? ""}
            className="h-10 rounded-lg border border-border bg-surface px-3 text-sm text-foreground focus:border-voc-red focus:outline-none focus:ring-2 focus:ring-voc-red/20"
          >
            <option value="">Kies een branche</option>
            {INDUSTRIES.map((industry) => (
              <option key={industry} value={industry}>
                {industry}
              </option>
            ))}
            {company.industry && !(INDUSTRIES as readonly string[]).includes(company.industry) && (
              <option value={company.industry}>{company.industry}</option>
            )}
          </select>
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="city" className="text-sm font-medium text-foreground">
            Vestigingsplaats
          </label>
          <Input id="city" name="city" defaultValue={company.city ?? ""} />
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="website" className="text-sm font-medium text-foreground">
          Website
        </label>
        <Input id="website" name="website" type="url" defaultValue={company.website ?? ""} placeholder="https://" />
      </div>

      <div className="flex flex-col gap-3">
        <p className="text-sm font-medium text-foreground">Social media</p>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="linkedin_url" className="text-xs font-medium text-muted">
            LinkedIn
          </label>
          <Input
            id="linkedin_url"
            name="linkedin_url"
            type="url"
            defaultValue={company.linkedin_url ?? ""}
            placeholder="https://www.linkedin.com/company/..."
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="instagram_url" className="text-xs font-medium text-muted">
            Instagram
          </label>
          <Input
            id="instagram_url"
            name="instagram_url"
            type="url"
            defaultValue={company.instagram_url ?? ""}
            placeholder="https://www.instagram.com/..."
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="facebook_url" className="text-xs font-medium text-muted">
            Facebook
          </label>
          <Input
            id="facebook_url"
            name="facebook_url"
            type="url"
            defaultValue={company.facebook_url ?? ""}
            placeholder="https://www.facebook.com/..."
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="address" className="text-sm font-medium text-foreground">
            Bezoekersadres
          </label>
          <Input id="address" name="address" defaultValue={company.address ?? ""} placeholder="Straatnaam 1" />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="postal_code" className="text-sm font-medium text-foreground">
            Postcode
          </label>
          <Input id="postal_code" name="postal_code" defaultValue={company.postal_code ?? ""} placeholder="9640 AB" />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="phone" className="text-sm font-medium text-foreground">
            Telefoonnummer
          </label>
          <Input id="phone" name="phone" type="tel" defaultValue={company.phone ?? ""} placeholder="0598 123456" />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="email" className="text-sm font-medium text-foreground">
            E-mailadres
          </label>
          <Input id="email" name="email" type="email" defaultValue={company.email ?? ""} placeholder="info@bedrijf.nl" />
        </div>
      </div>
      <p className="-mt-3 text-xs text-muted">
        Contactgegevens van het bedrijf; deze kunnen afwijken van de persoonlijke gegevens van medewerkers.
      </p>

      {state.error && (
        <p role="alert" className="rounded-lg bg-voc-red-light px-3 py-2 text-sm text-voc-red">
          {state.error}
        </p>
      )}
      {state.success && <p className="text-sm text-green-600">Opgeslagen.</p>}

      <div>
        <SubmitButton />
      </div>
    </form>
  );
}
