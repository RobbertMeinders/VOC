"use client";

import { useActionState, useEffect, useState } from "react";
import { useFormStatus } from "react-dom";
import { Upload } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { FileSelectButton } from "@/components/ui/FileSelectButton";
import { uploadDocumentAction, type DocumentFormState } from "@/app/(app)/documenten/actions";
import { useToast } from "@/lib/ui/ToastContext";
import { Textarea } from "@/components/ui/Textarea";

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
        className="flex items-center gap-1.5 rounded-full border border-border bg-surface px-3 py-1.5 text-sm font-medium text-foreground hover:bg-black/[.03] dark:hover:bg-white/[.06]"
      >
        <Upload size={16} />
        Uploaden
      </button>
    );
  }

  return (
    <form action={formAction} className="flex flex-col gap-3 rounded-2xl bg-surface p-4 shadow-sm">
      <Input name="title" placeholder="Titel" required />
      <Textarea
        name="description"
        rows={2}
        placeholder="Korte omschrijving (optioneel)"
      />
      <div>
        <Input name="category" placeholder="Categorie (optioneel)" list="document-categories" />
        <datalist id="document-categories">
          {categories.map((c) => (
            <option key={c} value={c} />
          ))}
        </datalist>
      </div>
      <FileSelectButton name="file" accept="application/pdf,image/png,image/jpeg,.doc,.docx,.ppt,.pptx" required />
      {state.error && (
        <p role="alert" className="rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger-text">
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
