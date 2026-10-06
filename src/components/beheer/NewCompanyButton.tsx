"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { Plus, X } from "lucide-react";
import { Input } from "@/components/ui/Input";
import { createCompanyAction, type CreateCompanyState } from "@/app/(app)/beheer/bedrijven/actions";

const initialState: CreateCompanyState = {};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="shrink-0 rounded-full bg-voc-red px-3.5 py-2 text-sm font-medium text-white hover:bg-voc-red-dark disabled:opacity-60"
    >
      {pending ? "Aanmaken…" : "Aanmaken"}
    </button>
  );
}

export function NewCompanyButton() {
  const [open, setOpen] = useState(false);
  const [state, formAction] = useActionState(createCompanyAction, initialState);

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mb-4 flex items-center gap-1.5 rounded-full bg-voc-red px-3.5 py-2 text-sm font-medium text-white hover:bg-voc-red-dark"
      >
        <Plus size={16} />
        Nieuw bedrijf
      </button>
    );
  }

  return (
    <form action={formAction} className="mb-4 flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <Input name="name" placeholder="Bedrijfsnaam" required autoFocus className="flex-1" />
        <SubmitButton />
        <button
          type="button"
          onClick={() => setOpen(false)}
          aria-label="Annuleren"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-border text-muted hover:bg-black/[.04] dark:hover:bg-white/[.06]"
        >
          <X size={16} />
        </button>
      </div>
      <p className="text-xs text-muted">
        Je komt daarna meteen op het volledige bewerkformulier (logo, adres, social media, ...).
      </p>
      {state.error && (
        <p role="alert" className="rounded-lg bg-voc-red-light px-3 py-2 text-sm text-voc-red-text">
          {state.error}
        </p>
      )}
    </form>
  );
}
