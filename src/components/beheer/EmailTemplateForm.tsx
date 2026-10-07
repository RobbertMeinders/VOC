"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { FileSelectButton } from "@/components/ui/FileSelectButton";
import {
  updateEmailTemplateAction,
  uploadEmailTemplateImageAction,
  type UpdateEmailTemplateState,
  type UploadEmailImageState,
} from "@/app/(app)/beheer/email-templates/actions";
import { useToast } from "@/lib/ui/ToastContext";
import type { Database } from "@/lib/types/database";

type EmailTemplate = Database["public"]["Tables"]["email_templates"]["Row"];

const initialState: UpdateEmailTemplateState = {};
const uploadInitialState: UploadEmailImageState = {};

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

function UploadSubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="sm" variant="secondary" disabled={pending}>
      {pending ? "Uploaden…" : "Uploaden"}
    </Button>
  );
}

// Los formulier (kan niet genest in het hoofdformulier) voor een logo/
// handtekening-afbeelding — plaatst na upload zelf een <img>-tag onderaan
// de HTML-inhoud, zodat je niet zelf ergens een link naartoe hoeft te
// zoeken/hosten.
function ImageUploadButton({ onInserted }: { onInserted: (url: string) => void }) {
  const [state, formAction] = useActionState(uploadEmailTemplateImageAction, uploadInitialState);
  const formRef = useRef<HTMLFormElement>(null);
  const insertedUrlRef = useRef<string | undefined>(undefined);

  useEffect(() => {
    if (state.url && state.url !== insertedUrlRef.current) {
      insertedUrlRef.current = state.url;
      onInserted(state.url);
      formRef.current?.reset();
    }
  }, [state.url, onInserted]);

  return (
    <form ref={formRef} action={formAction} className="flex flex-wrap items-center gap-2">
      <FileSelectButton
        name="image"
        accept="image/png,image/jpeg,image/webp"
        required
        label="Afbeelding kiezen"
        className="bg-black/[.06] text-xs text-foreground hover:bg-black/[.1] dark:bg-white/[.08]"
      />
      <UploadSubmitButton />
      {state.error && (
        <span role="alert" className="text-xs text-voc-red-text">
          {state.error}
        </span>
      )}
    </form>
  );
}

export function EmailTemplateForm({ template }: { template: EmailTemplate }) {
  const updateWithKey = updateEmailTemplateAction.bind(null, template.key);
  const [state, formAction] = useActionState(updateWithKey, initialState);
  const [subject, setSubject] = useState(template.subject);
  const [bodyHtml, setBodyHtml] = useState(template.body_html);
  const formId = `email-template-${template.key}`;
  const toast = useToast();

  useEffect(() => {
    if (state.success) toast("Opgeslagen.");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  function insertImage(url: string) {
    setBodyHtml((prev) => `${prev}${prev && !prev.endsWith("\n") ? "\n" : ""}<img src="${url}" alt="Logo" style="max-width:200px;" />\n`);
  }

  return (
    // Geen <form> als buitenste element: het losse ImageUploadButton-
    // formulier zit hier tussenin, en formulieren mogen niet in elkaar
    // genest zijn. Onderwerp/Inhoud koppelen daarom via het HTML5
    // form="..."-attribuut aan het opslaan-formulier onderaan, ook al staan
    // ze er in de DOM niet direct in.
    <div className="rounded-2xl border border-border bg-surface p-6 shadow-sm">
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
              form={formId}
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              required
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor={`body-${template.key}`} className="text-sm font-medium text-foreground">
              Inhoud (HTML)
            </label>
            <div className="flex flex-col gap-1 rounded-lg border border-dashed border-border p-2.5">
              <p className="text-xs text-muted">Afbeelding toevoegen (bv. logo of handtekening)</p>
              <ImageUploadButton onInserted={insertImage} />
            </div>
            <textarea
              id={`body-${template.key}`}
              name="body_html"
              form={formId}
              rows={10}
              value={bodyHtml}
              onChange={(e) => setBodyHtml(e.target.value)}
              required
              className="rounded-lg border border-input-border bg-background px-3 py-2 font-mono text-xs text-foreground focus:border-voc-red focus:outline-none focus:ring-2 focus:ring-voc-red/20"
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

      <form id={formId} action={formAction}>
        {state.error && (
          <p role="alert" className="mb-3 mt-4 rounded-lg bg-voc-red-light px-3 py-2 text-sm text-voc-red-text">
            {state.error}
          </p>
        )}
        <div className="mt-4">
          <SubmitButton />
        </div>
      </form>
    </div>
  );
}
