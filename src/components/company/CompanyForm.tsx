"use client";

import { useActionState, useEffect, useState } from "react";
import { useFormStatus } from "react-dom";
import { Camera } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Switch } from "@/components/ui/Switch";
import { FieldError } from "@/components/ui/FieldError";
import { FormErrorSummary } from "@/components/ui/FormErrorSummary";
import { CompanyLogo } from "./CompanyLogo";
import { updateCompanyAction, type UpdateCompanyState } from "@/app/(app)/bedrijven/[id]/actions";
import { compressInputFile } from "@/lib/image/compress";
import { INDUSTRIES } from "@/lib/constants/industries";
import { useToast } from "@/lib/ui/ToastContext";
import { useFieldValidation } from "@/lib/validation/useFieldValidation";
import { validateUrl, validateEmail } from "@/lib/validation/fields";
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
  const toast = useToast();
  const { errors, validateField, validateAll } = useFieldValidation({
    website: (value) => validateUrl(value),
    linkedin_url: (value) => validateUrl(value),
    instagram_url: (value) => validateUrl(value),
    facebook_url: (value) => validateUrl(value),
    email: (value) => validateEmail(value),
  });

  useEffect(() => {
    if (state.success) toast("Opgeslagen.");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);
  // Gecontroleerd i.p.v. defaultValue: React reset een <form> na een
  // geslaagde action-submit terug naar de oorspronkelijke defaultValue van
  // elk ongecontroleerd veld — bij een lege branche (defaultValue="") sprong
  // de keuze zo meteen na het opslaan terug naar "Kies een branche", en een
  // tweede keer opslaan wiste de zojuist opgeslagen branche dus weer.
  const [industry, setIndustry] = useState(company.industry ?? "");
  const [showAddress, setShowAddress] = useState(company.show_address);
  const [isPubliclyVisible, setIsPubliclyVisible] = useState(company.is_publicly_visible);

  // useState's initiële waarde draait alleen bij de allereerste mount —
  // revalidatePath() ná een geslaagde update levert deze Server Component
  // een verse `company`-prop, maar de hierboven al bestaande, gecontroleerde
  // CompanyForm-instance blijft gewoon staan. Zonder deze sync bleef de
  // dropdown daardoor op de waarde van vóór het opslaan hangen zodra er
  // ergens tussen opslaan en de revalidatie toch een her-render met de oude
  // company-prop plaatsvond — pas een volledige page reload (nieuwe mount)
  // liet de echte, opgeslagen waarde zien. State tijdens het renderen
  // aanpassen (React's eigen "adjusting state" patroon) i.p.v. een effect,
  // want een effect zou hier een overbodige extra render-cyclus toevoegen.
  const [prevIndustryProp, setPrevIndustryProp] = useState(company.industry);
  if (company.industry !== prevIndustryProp) {
    setPrevIndustryProp(company.industry);
    setIndustry(company.industry ?? "");
  }

  return (
    <form
      action={formAction}
      onSubmit={(e) => {
        if (!validateAll(new FormData(e.currentTarget))) e.preventDefault();
      }}
      className="flex flex-col gap-5"
    >
      <FormErrorSummary errors={errors} />
      <div className="flex items-center gap-4">
        <div className="relative">
          <CompanyLogo logoUrl={shownLogo} name={company.name} size={72} wide />
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
            accept="image/png,image/jpeg,image/webp,image/svg+xml,image/avif"
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
          className="rounded-lg border border-input-border bg-surface px-3 py-2 text-sm text-foreground placeholder:text-muted focus:border-voc-red focus:outline-none focus:ring-2 focus:ring-voc-red/20"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="industry" className="text-sm font-medium text-foreground">
            Branche
          </label>
          <Select id="industry" name="industry" value={industry} onChange={(e) => setIndustry(e.target.value)} className="h-10 pl-3">
            <option value="">Kies een branche</option>
            {INDUSTRIES.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
            {industry && !(INDUSTRIES as readonly string[]).includes(industry) && (
              <option value={industry}>{industry}</option>
            )}
          </Select>
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
        <Input
          id="website"
          name="website"
          type="text"
          inputMode="url"
          defaultValue={company.website ?? ""}
          placeholder="https://"
          invalid={Boolean(errors.website)}
          onBlur={(e) => validateField("website", e.target.value)}
        />
        <FieldError message={errors.website} />
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
            type="text"
            inputMode="url"
            defaultValue={company.linkedin_url ?? ""}
            placeholder="https://www.linkedin.com/company/..."
            invalid={Boolean(errors.linkedin_url)}
            onBlur={(e) => validateField("linkedin_url", e.target.value)}
          />
          <FieldError message={errors.linkedin_url} />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="instagram_url" className="text-xs font-medium text-muted">
            Instagram
          </label>
          <Input
            id="instagram_url"
            name="instagram_url"
            type="text"
            inputMode="url"
            defaultValue={company.instagram_url ?? ""}
            placeholder="https://www.instagram.com/..."
            invalid={Boolean(errors.instagram_url)}
            onBlur={(e) => validateField("instagram_url", e.target.value)}
          />
          <FieldError message={errors.instagram_url} />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="facebook_url" className="text-xs font-medium text-muted">
            Facebook
          </label>
          <Input
            id="facebook_url"
            name="facebook_url"
            type="text"
            inputMode="url"
            defaultValue={company.facebook_url ?? ""}
            placeholder="https://www.facebook.com/..."
            invalid={Boolean(errors.facebook_url)}
            onBlur={(e) => validateField("facebook_url", e.target.value)}
          />
          <FieldError message={errors.facebook_url} />
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
      <div className="flex items-center justify-between gap-4 rounded-lg border border-border bg-background px-3 py-2.5">
        <div>
          <p className="text-sm font-medium text-foreground">Bezoekersadres tonen</p>
          <p className="text-xs text-muted">
            Uitzetten verbergt het adres op de bedrijfspagina en op de kaart — handig als hier een privéadres staat.
          </p>
        </div>
        <input type="hidden" name="show_address" value={showAddress ? "on" : ""} />
        <Switch checked={showAddress} onChange={() => setShowAddress((v) => !v)} label="Bezoekersadres tonen" />
      </div>

      <div className="flex items-center justify-between gap-4 rounded-lg border border-border bg-background px-3 py-2.5">
        <div>
          <p className="text-sm font-medium text-foreground">Zichtbaar op de openbare bedrijvengids</p>
          <p className="text-xs text-muted">
            Toont naam, logo, branche, plaats, omschrijving en website op de bedrijvengids-embed van de VOC-website.
            Contactgegevens (telefoon, e-mail, adres) worden nooit publiek getoond.
          </p>
        </div>
        <input type="hidden" name="is_publicly_visible" value={isPubliclyVisible ? "on" : ""} />
        <Switch
          checked={isPubliclyVisible}
          onChange={() => setIsPubliclyVisible((v) => !v)}
          label="Zichtbaar op de openbare bedrijvengids"
        />
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
          <Input
            id="email"
            name="email"
            type="text"
            inputMode="email"
            defaultValue={company.email ?? ""}
            placeholder="info@bedrijf.nl"
            invalid={Boolean(errors.email)}
            onBlur={(e) => validateField("email", e.target.value)}
          />
          <FieldError message={errors.email} />
        </div>
      </div>
      <p className="-mt-3 text-xs text-muted">
        Contactgegevens van het bedrijf; deze kunnen afwijken van de persoonlijke gegevens van medewerkers.
      </p>

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
