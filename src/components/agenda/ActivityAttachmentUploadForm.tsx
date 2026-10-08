"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { Paperclip } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { FileSelectButton } from "@/components/ui/FileSelectButton";
import { addActivityAttachmentAction, type AttachmentFormState } from "@/app/(app)/agenda/actions";
import { compressInputFile } from "@/lib/image/compress";

const initialState: AttachmentFormState = {};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="sm" disabled={pending}>
      {pending ? "Toevoegen…" : "Toevoegen"}
    </Button>
  );
}

export function ActivityAttachmentUploadForm({ activityId }: { activityId: string }) {
  const addWithId = addActivityAttachmentAction.bind(null, activityId);
  const [open, setOpen] = useState(false);
  const [state, formAction] = useActionState(addWithId, initialState);

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 text-sm font-medium text-voc-red-text hover:underline"
      >
        <Paperclip size={14} />
        Bijlage toevoegen
      </button>
    );
  }

  return (
    <form action={formAction} className="flex flex-col gap-3 rounded-xl border border-border bg-surface p-4 shadow-sm">
      <FileSelectButton
        name="file"
        accept="application/pdf,image/png,image/jpeg,.doc,.docx,.ppt,.pptx"
        required
        onChange={(e) => {
          void compressInputFile(e.target);
        }}
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
