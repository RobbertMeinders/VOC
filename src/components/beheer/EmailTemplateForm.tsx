"use client";

import { useActionState, useEffect, useRef, useState, type ChangeEvent } from "react";
import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/Button";
import { FileSelectButton } from "@/components/ui/FileSelectButton";
import { VariableEditor, type VariableEditorHandle } from "@/components/ui/VariableEditor";
import { variablesForTemplate } from "@/lib/templates/variables";
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

// Logo/handtekening-afbeelding (0102, communicatieplan fase 1c): zonder
// expliciete width/height-attributen — enkel CSS max-width — toonden veel
// e-mailclients (met name Outlook desktop, dat Word's renderer gebruikt en
// style="max-width" negeert) een groot bronbestand gewoon op volledig
// formaat. Een vaste pixel-width/height dwingt dat overal af; de
// beeldverhouding blijft behouden doordat die uit het echte, door de
// browser uitgelezen bronformaat wordt berekend i.p.v. een vaste waarde.
const MAX_LOGO_WIDTH = 200;
const MAX_LOGO_HEIGHT = 80;
const FALLBACK_LOGO_DIMENSIONS = { width: 160, height: 60 };

function scaleToFit(naturalWidth: number, naturalHeight: number): { width: number; height: number } {
  if (!naturalWidth || !naturalHeight) return FALLBACK_LOGO_DIMENSIONS;
  // Math.min(1, ...): nooit opschalen — een klein logo blijft klein i.p.v.
  // vergroot (en dus wazig) te worden tot de maximale afmetingen.
  const scale = Math.min(1, MAX_LOGO_WIDTH / naturalWidth, MAX_LOGO_HEIGHT / naturalHeight);
  return { width: Math.round(naturalWidth * scale), height: Math.round(naturalHeight * scale) };
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
// handtekening-afbeelding — voegt na upload zelf een <img>-tag in op de
// cursorpositie in het voorbeeld, zodat je niet zelf ergens een link
// naartoe hoeft te zoeken/hosten.
function ImageUploadButton({ onInserted }: { onInserted: (html: string) => void }) {
  const [state, formAction] = useActionState(uploadEmailTemplateImageAction, uploadInitialState);
  const formRef = useRef<HTMLFormElement>(null);
  const insertedUrlRef = useRef<string | undefined>(undefined);
  // Gevuld zodra het gekozen bestand client-side is ingelezen (zie
  // handleFileChange) — ruim vóór de upload zelf klaar, dus geen wachten
  // nodig op de server om de afmetingen te kennen.
  const dimensionsRef = useRef(FALLBACK_LOGO_DIMENSIONS);

  useEffect(() => {
    if (state.url && state.url !== insertedUrlRef.current) {
      insertedUrlRef.current = state.url;
      const { width, height } = dimensionsRef.current;
      onInserted(
        `<img src="${state.url}" alt="Logo" width="${width}" height="${height}" style="width:${width}px;height:${height}px;max-width:${MAX_LOGO_WIDTH}px;max-height:${MAX_LOGO_HEIGHT}px;" />`
      );
      formRef.current?.reset();
    }
  }, [state.url, onInserted]);

  function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const objectUrl = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      dimensionsRef.current = scaleToFit(img.naturalWidth, img.naturalHeight);
      URL.revokeObjectURL(objectUrl);
    };
    img.onerror = () => URL.revokeObjectURL(objectUrl);
    img.src = objectUrl;
  }

  return (
    <form ref={formRef} action={formAction} className="flex flex-wrap items-center gap-2">
      <FileSelectButton
        name="image"
        accept="image/png,image/jpeg,image/webp"
        required
        label="Afbeelding kiezen"
        onChange={handleFileChange}
        className="bg-black/[.06] text-xs text-foreground hover:bg-black/[.1] dark:bg-white/[.08] dark:hover:bg-white/[.12]"
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
  // Welke {{...}}-variabelen voor dit sjabloon gelden staat al in de eigen
  // description ("Variabelen: {{a}}, {{b}}, ...", zie migraties) — geen los,
  // dubbel-onderhouden lijstje per sjabloon-key nodig.
  const variables = variablesForTemplate(template.description);
  const subjectEditorRef = useRef<VariableEditorHandle>(null);
  const bodyEditorRef = useRef<VariableEditorHandle>(null);
  // Een variabele-knop voegt in bij het laatst-gefocuste veld (onderwerp of
  // inhoud) — standaard de inhoud, het meest voorkomende geval.
  const activeEditorRef = useRef<VariableEditorHandle | null>(null);

  useEffect(() => {
    if (state.success) toast("Opgeslagen.");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  return (
    // Geen <form> als buitenste element: het losse ImageUploadButton-
    // formulier zit hier tussenin, en formulieren mogen niet in elkaar
    // genest zijn. Onderwerp/Inhoud koppelen daarom via het HTML5
    // form="..."-attribuut aan het opslaan-formulier onderaan, ook al staan
    // ze er in de DOM niet direct in.
    <div className="rounded-2xl bg-surface p-6 shadow-sm">
      <h2 className="text-sm font-semibold text-foreground">{template.key}</h2>
      {template.description && <p className="mb-4 mt-1 text-xs text-muted">{template.description}</p>}

      {/* Stijlronde: direct typen in het voorbeeld i.p.v. een los HTML-veld
          naast een losse preview — en knoppen om een variabele in te
          voegen, die in het voorbeeld meteen de echte voorbeeldtekst laat
          zien (zie VariableEditor) i.p.v. de rauwe {{...}}-tekst. */}
      {variables.length > 0 && (
        <div className="mb-3 flex flex-wrap items-center gap-1.5">
          <span className="text-xs text-muted">Invoegen:</span>
          {variables.map((v) => (
            <button
              key={v.key}
              type="button"
              onClick={() => activeEditorRef.current?.insertVariable(v.key)}
              className="rounded-full border border-border bg-surface px-2.5 py-1 text-xs font-medium text-foreground hover:bg-black/[.03] dark:hover:bg-white/[.06]"
            >
              {v.label}
            </button>
          ))}
        </div>
      )}

      <div className="flex flex-col gap-1.5">
        <p className="text-sm font-medium text-foreground">Voorbeeld — typ hier direct</p>
        <div className="rounded-lg border border-border bg-white p-4 text-[#17171a] shadow-sm">
          <VariableEditor
            ref={subjectEditorRef}
            initialValue={subject}
            variables={variables}
            mode="text"
            onChange={setSubject}
            onFocus={() => {
              activeEditorRef.current = subjectEditorRef.current;
            }}
            aria-label="Onderwerp"
            className="text-sm font-semibold"
          />
          <hr className="my-2 border-[#e5e5ea]" />
          <VariableEditor
            ref={bodyEditorRef}
            initialValue={bodyHtml}
            variables={variables}
            mode="html"
            onChange={setBodyHtml}
            onFocus={() => {
              activeEditorRef.current = bodyEditorRef.current;
            }}
            aria-label="Inhoud"
            className="text-sm leading-relaxed [&_a]:text-voc-red [&_p]:my-2"
          />
        </div>
      </div>

      <div className="mt-3 flex flex-col gap-1 rounded-lg border border-dashed border-border p-2.5">
        <p className="text-xs text-muted">Afbeelding toevoegen (bv. logo of handtekening)</p>
        <ImageUploadButton onInserted={(html) => bodyEditorRef.current?.insertHtml(html)} />
      </div>

      <input type="hidden" name="subject" form={formId} value={subject} />
      <input type="hidden" name="body_html" form={formId} value={bodyHtml} />

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
