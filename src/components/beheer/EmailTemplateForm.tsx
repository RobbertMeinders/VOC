"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { updateEmailTemplateAction, type UpdateEmailTemplateState } from "@/app/(app)/beheer/email-templates/actions";
import type { Database } from "@/lib/types/database";

type EmailTemplate = Database["public"]["Tables"]["email_templates"]["Row"];

const initialState: UpdateEmailTemplateState = {};

// Voorbeeldwaarde voor de preview — de échte mail vult {{link}} met de
// werkelijke uitnodigings-/reset-link.
const PREVIEW_VARIABLES: Record<string, string> = { link: "https://voorbeeld.nl/link" };

function renderPreview(subject: string, bodyHtml: string) {
  const rendered = Object.entries(PREVIEW_VARIABLES).reduce(
    (html, [key, value]) => html.replaceAll(`{{${key}}}`, value),
    bodyHtml
  );
  const renderedSubject = Object.entries(PREVIEW_VARIABLES).reduce(
    (text, [key, value]) => text.replaceAll(`{{${key}}}`, value),
    subject
  );

  return `<!DOCTYPE html><html><head><meta charset="utf-8">
    <style>
      body { font-family: -apple-system, system-ui, sans-serif; color: #17171a; padding: 16px; margin: 0; }
      a { color: #e8000f; }
    </style>
    </head><body>
      <p style="font-size:12px;color:#6b6b72;margin:0 0 8px">Onderwerp: ${renderedSubject}</p>
      <hr style="border:none;border-top:1px solid #e5e5ea;margin:0 0 12px">
      ${rendered}
    </body></html>`;
}

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
  const [subject, setSubject] = useState(template.subject);
  const [bodyHtml, setBodyHtml] = useState(template.body_html);

  return (
    <form action={formAction} className="rounded-2xl border border-border bg-surface p-6 shadow-sm">
      <h2 className="text-sm font-semibold text-foreground">{template.key}</h2>
      {template.description && <p className="mb-4 mt-1 text-xs text-muted">{template.description}</p>}

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <label htmlFor={`subject-${template.key}`} className="text-sm font-medium text-foreground">
              Onderwerp
            </label>
            <Input
              id={`subject-${template.key}`}
              name="subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              required
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor={`body-${template.key}`} className="text-sm font-medium text-foreground">
              Inhoud (HTML)
            </label>
            <textarea
              id={`body-${template.key}`}
              name="body_html"
              rows={10}
              value={bodyHtml}
              onChange={(e) => setBodyHtml(e.target.value)}
              required
              className="rounded-lg border border-border bg-background px-3 py-2 font-mono text-xs text-foreground focus:border-voc-red focus:outline-none focus:ring-2 focus:ring-voc-red/20"
            />
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <p className="text-sm font-medium text-foreground">Voorbeeld</p>
          <iframe
            title={`Voorbeeld ${template.key}`}
            srcDoc={renderPreview(subject, bodyHtml)}
            sandbox=""
            className="h-full min-h-[280px] w-full rounded-lg border border-border bg-white"
          />
        </div>
      </div>

      {state.error && (
        <p role="alert" className="mb-3 mt-4 rounded-lg bg-voc-red-light px-3 py-2 text-sm text-voc-red">
          {state.error}
        </p>
      )}
      {state.success && <p className="mb-3 mt-4 text-sm text-green-600">Opgeslagen.</p>}

      <div className="mt-4">
        <SubmitButton />
      </div>
    </form>
  );
}
