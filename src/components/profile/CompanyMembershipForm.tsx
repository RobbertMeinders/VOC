"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { Building2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { CompanySelector } from "@/components/company/CompanySelector";
import { updateMyCompanyAction, type UpdateCompanyMembershipState } from "@/app/(app)/profiel/actions";

const initialState: UpdateCompanyMembershipState = {};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="sm" disabled={pending}>
      {pending ? "Opslaan…" : "Opslaan"}
    </Button>
  );
}

export function CompanyMembershipForm({ hasCompany }: { hasCompany: boolean }) {
  const [state, formAction] = useActionState(updateMyCompanyAction, initialState);
  const [open, setOpen] = useState(!hasCompany);

  if (state.success) {
    return (
      <p className="rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700 dark:bg-green-500/10 dark:text-green-400">
        Bedrijfskoppeling opgeslagen.
      </p>
    );
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 text-sm font-medium text-voc-red hover:underline"
      >
        <Building2 size={14} />
        Bedrijf wijzigen
      </button>
    );
  }

  return (
    <form action={formAction} className="flex flex-col gap-3 rounded-xl border border-border bg-surface p-4 shadow-sm">
      <p className="text-sm font-medium text-foreground">Bij welk bedrijf werk je?</p>
      <CompanySelector />
      {state.error && (
        <p role="alert" className="rounded-lg bg-voc-red-light px-3 py-2 text-sm text-voc-red">
          {state.error}
        </p>
      )}
      <div className="flex items-center gap-2">
        <SubmitButton />
        {hasCompany && (
          <button type="button" onClick={() => setOpen(false)} className="text-sm text-muted hover:underline">
            Annuleren
          </button>
        )}
      </div>
    </form>
  );
}
