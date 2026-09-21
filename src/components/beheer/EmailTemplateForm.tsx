"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { updateEmailTemplateAction, type UpdateEmailTemplateState } from "@/app/(app)/beheer/email-templates/actions";
import type { Database } from "@/lib/types/database";

type EmailTemplate = Database["public"]["Tables"]["email_templates"]["Row"];

const initialState: UpdateEmailTemplateState = {};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="sm" disabled={pending}>
      {pending ? "Opslaan…" : "Opslaan"}
    </Button>
  );
}

export function EmailTemplateForm({ template }: { template: EmailTemplate }) {
  const updateWithKey = updateEmailTemplateAction.bind(null, template.key);
  const [state, formAction] = useActionState(updateWithKey, initialState);

  return (
    <form action={formAction} className="rounded-2xl border border-border bg-surface p-6 shadow-sm">
      <h2 className="text-sm font-semibold text-foreground">{template.key}</h2>
      {template.description && <p className="mb-4 mt-1 text-xs text-muted">{template.description}</p>}

      <div className="mb-3 flex flex-col gap-1.5">
        <label htmlFor={`subject-${template.key}`} className="text-sm font-medium text-foreground">
          Onderwerp
        </label>
        <Input id={`subject-${template.key}`} name="subject" defaultValue={template.subject} required />
      </div>

      <div className="mb-3 flex flex-col gap-1.5">
        <label htmlFor={`body-${template.key}`} className="text-sm font-medium text-foreground">
          Inhoud (HTML)
        </label>
        <textarea
          id={`body-${template.key}`}
          name="body_html"
          rows={8}
          defaultValue={template.body_html}
          required
          className="rounded-lg border border-border bg-background px-3 py-2 font-mono text-xs text-foreground focus:border-voc-red focus:outline-none focus:ring-2 focus:ring-voc-red/20"
        />
      </div>

      {state.error && (
        <p role="alert" className="mb-3 rounded-lg bg-voc-red-light px-3 py-2 text-sm text-voc-red">
          {state.error}
        </p>
      )}
      {state.success && <p className="mb-3 text-sm text-green-600">Opgeslagen.</p>}

      <SubmitButton />
    </form>
  );
}
