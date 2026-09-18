"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import Image from "next/image";
import { Building2, Camera } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
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
          {shownLogo ? (
            <Image src={shownLogo} alt={company.name} width={72} height={72} className="h-[72px] w-[72px] rounded-xl object-cover" />
          ) : (
            <div className="flex h-[72px] w-[72px] items-center justify-center rounded-xl bg-voc-red-light text-voc-red">
              <Building2 size={28} />
            </div>
          )}
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
        <label htmlFor="description" className="text-sm font-medium text-foreground">
          Korte omschrijving
        </label>
        <textarea
          id="description"
          name="description"
          rows={3}
          defaultValue={company.description ?? ""}
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
