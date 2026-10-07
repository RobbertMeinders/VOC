"use client";

import { useActionState, useEffect, useState } from "react";
import { useFormStatus } from "react-dom";
import { Upload } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { uploadDocumentAction, type DocumentFormState } from "@/app/(app)/documenten/actions";
import { useToast } from "@/lib/ui/ToastContext";

const initialState: DocumentFormState = {};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="sm" disabled={pending}>
      {pending ? "Uploaden…" : "Uploaden"}
    </Button>
  );
}

export function DocumentUploadForm({ categories }: { categories: string[] }) {
  const [open, setOpen] = useState(false);
  const [state, formAction] = useActionState(uploadDocumentAction, initialState);
  const toast = useToast();

  useEffect(() => {
    if (state.success) toast("Geüpload.");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 rounded-full bg-voc-red px-3 py-1.5 text-sm font-medium text-white hover:bg-voc-red-dark"
      >
        <Upload size={16} />
        Document uploaden
      </button>
    );
  }

  return (
    <form action={formAction} className="flex flex-col gap-3 rounded-xl border border-border bg-surface p-4 shadow-sm">
      <Input name="title" placeholder="Titel" required />
      <textarea
        name="description"
        rows={2}
        placeholder="Korte omschrijving (optioneel)"
        className="rounded-lg border border-input-border bg-surface px-3 py-2 text-sm text-foreground placeholder:text-muted focus:border-voc-red focus:outline-none focus:ring-2 focus:ring-voc-red/20"
      />
      <div>
        <Input name="category" placeholder="Categorie (optioneel)" list="document-categories" />
        <datalist id="document-categories">
          {categories.map((c) => (
            <option key={c} value={c} />
          ))}
        </datalist>
      </div>
      <input
        name="file"
        type="file"
        accept="application/pdf,image/png,image/jpeg,.doc,.docx,.ppt,.pptx"
        required
        className="text-sm text-foreground file:mr-3 file:cursor-pointer file:rounded-full file:border-0 file:bg-voc-red-light file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-voc-red-text hover:file:bg-voc-red/20"
      />
      {state.error && (
        <p role="alert" className="rounded-lg bg-voc-red-light px-3 py-2 text-sm text-voc-red-text">
          {state.error}
        </p>
      )}
      <div className="flex items-center gap-2">
        <SubmitButton />
        <button type="button" onClick={() => setOpen(false)} className="text-sm text-muted hover:underline">
          Annuleren
        </button>
      </div>
    </form>
  );
}
