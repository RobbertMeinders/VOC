"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { VariableEditor, type VariableEditorHandle } from "@/components/ui/VariableEditor";
import { variablesForTemplate } from "@/lib/templates/variables";
import { updatePushTemplateAction, type UpdatePushTemplateState } from "@/app/(app)/beheer/email-templates/actions";
import { useToast } from "@/lib/ui/ToastContext";
import type { Database } from "@/lib/types/database";

type PushTemplate = Database["public"]["Tables"]["push_templates"]["Row"];

const initialState: UpdatePushTemplateState = {};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="sm" disabled={pending}>
      {pending ? "Opslaan…" : "Opslaan"}
    </Button>
  );
}

export function PushTemplateForm({ template }: { template: PushTemplate }) {
  const updateWithKey = updatePushTemplateAction.bind(null, template.key);
  const [state, formAction] = useActionState(updateWithKey, initialState);
  const [title, setTitle] = useState(template.title);
  const [body, setBody] = useState(template.body);
  const toast = useToast();
  // Welke {{...}}-variabelen voor dit sjabloon gelden staat al in de eigen
  // description ("Variabelen: {{a}}, {{b}}, ...", zie migraties).
  const variables = variablesForTemplate(template.description);
  const titleEditorRef = useRef<VariableEditorHandle>(null);
  const bodyEditorRef = useRef<VariableEditorHandle>(null);
  // Een variabele-knop voegt in bij het laatst-gefocuste veld (titel of
  // bericht) — standaard het bericht, het meest voorkomende geval.
  const activeEditorRef = useRef<VariableEditorHandle | null>(null);

  useEffect(() => {
    if (state.success) toast("Opgeslagen.");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  return (
    <form action={formAction} className="rounded-2xl bg-surface p-6 shadow-sm">
      <h2 className="text-sm font-semibold text-foreground">{template.key}</h2>
      {template.description && <p className="mb-4 mt-1 text-xs text-muted">{template.description}</p>}

      {/* Stijlronde: direct typen in het voorbeeld i.p.v. losse Titel-/
          Berichtvelden naast een losse preview — en knoppen om een
          variabele in te voegen, die in het voorbeeld meteen de echte
          voorbeeldtekst laat zien (zie VariableEditor) i.p.v. de rauwe
          {{...}}-tekst. */}
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

      <p className="mb-1.5 text-sm font-medium text-foreground">Voorbeeld — typ hier direct</p>
      <div className="flex min-h-[72px] items-start gap-3 rounded-lg border border-border bg-white p-4 shadow-sm">
        <div className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full bg-petrol-soft text-petrol">
          <Bell size={16} />
        </div>
        <div className="min-w-0 flex-1">
          <VariableEditor
            ref={titleEditorRef}
            initialValue={title}
            variables={variables}
            mode="text"
            onChange={setTitle}
            onFocus={() => {
              activeEditorRef.current = titleEditorRef.current;
            }}
            aria-label="Titel"
            className="text-sm font-medium text-[#17171a]"
          />
          <VariableEditor
            ref={bodyEditorRef}
            initialValue={body}
            variables={variables}
            mode="text"
            onChange={setBody}
            onFocus={() => {
              activeEditorRef.current = bodyEditorRef.current;
            }}
            aria-label="Bericht"
            className="mt-0.5 text-sm text-[#6b6b72]"
          />
        </div>
      </div>

      <input type="hidden" name="title" value={title} />
      <input type="hidden" name="body" value={body} />

      {state.error && (
        <p role="alert" className="mb-3 mt-4 rounded-lg bg-voc-red-light px-3 py-2 text-sm text-voc-red-text">
          {state.error}
        </p>
      )}
      <div className="mt-4">
        <SubmitButton />
      </div>
    </form>
  );
}
