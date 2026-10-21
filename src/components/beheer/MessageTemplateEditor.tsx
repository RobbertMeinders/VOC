"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import { clsx } from "clsx";
import { Mail, Bell } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { VariableEditor, type VariableEditorHandle } from "@/components/ui/VariableEditor";
import { variablesForMessageTemplate } from "@/lib/templates/message-template-variables";
import { formatDateNumeric } from "@/lib/format/date";
import {
  updateMessageTemplateAction,
  resetMessageTemplateAction,
  sendTestMessageEmailAction,
  type UpdateMessageTemplateState,
  type ResetMessageTemplateState,
  type SendTestMessageState,
} from "@/app/(app)/beheer/instellingen/message-templates-actions";
import { useToast } from "@/lib/ui/ToastContext";
import type { Database } from "@/lib/types/database";

export type MessageTemplate = Database["public"]["Tables"]["message_templates"]["Row"];

const updateInitial: UpdateMessageTemplateState = {};
const resetInitial: ResetMessageTemplateState = {};
const testInitial: SendTestMessageState = {};

function SaveButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="sm" disabled={pending}>
      {pending ? "Opslaan…" : "Opslaan"}
    </Button>
  );
}

function SecondaryButton({
  children,
  pendingLabel,
  formAction,
}: {
  children: string;
  pendingLabel: string;
  formAction: (formData: FormData) => void;
}) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      formAction={formAction}
      disabled={pending}
      className="rounded-full border border-border bg-surface px-3 py-1.5 text-xs font-medium text-foreground hover:bg-black/[.03] disabled:opacity-60 dark:hover:bg-white/[.06]"
    >
      {pending ? pendingLabel : children}
    </button>
  );
}

export function MessageTemplateEditor({
  template,
  onDirtyChange,
}: {
  template: MessageTemplate;
  onDirtyChange: (dirty: boolean) => void;
}) {
  const toast = useToast();
  const variables = variablesForMessageTemplate(template.key);

  const [channel, setChannel] = useState<"mail" | "push">("mail");
  const [subject, setSubject] = useState(template.subject);
  const [bodyHtml, setBodyHtml] = useState(template.body_html);
  const [ctaLabel, setCtaLabel] = useState(template.cta_label);
  const [afterHtml, setAfterHtml] = useState(template.after_html);
  const [signatureType, setSignatureType] = useState<"alg" | "pers">(template.signature_type);
  const [pushTitle, setPushTitle] = useState(template.push_title ?? "");
  const [pushBody, setPushBody] = useState(template.push_body ?? "");

  const subjectRef = useRef<VariableEditorHandle>(null);
  const bodyRef = useRef<VariableEditorHandle>(null);
  const afterRef = useRef<VariableEditorHandle>(null);
  const activeEditorRef = useRef<VariableEditorHandle | null>(null);

  const [updateState, updateAction] = useActionState(updateMessageTemplateAction.bind(null, template.key), updateInitial);
  const [resetState, resetAction] = useActionState(resetMessageTemplateAction.bind(null, template.key), resetInitial);
  const [testState, testAction] = useActionState(sendTestMessageEmailAction.bind(null, template.key), testInitial);

  const dirty =
    subject !== template.subject ||
    bodyHtml !== template.body_html ||
    ctaLabel !== template.cta_label ||
    afterHtml !== template.after_html ||
    signatureType !== template.signature_type ||
    pushTitle !== (template.push_title ?? "") ||
    pushBody !== (template.push_body ?? "");

  useEffect(() => {
    onDirtyChange(dirty);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dirty]);

  // Na succesvol opslaan/terugzetten is het formulier weer "schoon" t.o.v.
  // de (net ververste) server-props — revalidatePath in de actions ververst
  // de pagina, wat dit component laat remounten op de nieuwe `template`-
  // prop (zie key={template.key+template.updated_at} bij de aanroeper).
  useEffect(() => {
    if (updateState.success) toast("Opgeslagen.");
    if (updateState.error) toast(updateState.error, "error");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [updateState]);
  useEffect(() => {
    if (resetState.success) toast("Teruggezet naar standaardtekst.");
    if (resetState.error) toast(resetState.error, "error");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resetState]);
  useEffect(() => {
    if (testState.success) toast("Testmail verstuurd naar je eigen e-mailadres.");
    if (testState.error) toast(testState.error, "error");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [testState]);

  const formId = `message-template-${template.key}`;

  return (
    <div className="flex flex-col gap-3">
      <div className="rounded-2xl bg-surface p-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 className="font-display text-lg font-bold text-foreground">{template.name}</h3>
            <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
              <span>
                <b className="font-semibold text-foreground">Wanneer:</b> {template.when_text}
              </span>
              <span>
                <b className="font-semibold text-foreground">Naar:</b> {template.to_text}
              </span>
            </div>
          </div>
          {template.has_push && (
            <div className="inline-flex gap-1 rounded-xl bg-raised p-1">
              <button
                type="button"
                onClick={() => setChannel("mail")}
                className={clsx(
                  "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold",
                  channel === "mail" ? "bg-petrol text-white" : "text-muted"
                )}
              >
                <Mail size={13} />
                E-mail
              </button>
              <button
                type="button"
                onClick={() => setChannel("push")}
                className={clsx(
                  "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold",
                  channel === "push" ? "bg-petrol text-white" : "text-muted"
                )}
              >
                <Bell size={13} />
                Pushmelding
              </button>
            </div>
          )}
        </div>

        {channel === "mail" ? (
          <div className="mt-4 flex flex-col gap-3">
            {variables.length > 0 && (
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-xs text-muted">Het portaal vult in (klik om in te voegen):</span>
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

            <div className="rounded-lg border border-border bg-white p-4 text-[#17171a] shadow-sm">
              <div className="mb-2 text-[13px] font-bold text-[#67625b]">
                Onderwerp:{" "}
                <VariableEditor
                  ref={subjectRef}
                  initialValue={subject}
                  variables={variables}
                  mode="text"
                  onChange={setSubject}
                  onFocus={() => (activeEditorRef.current = subjectRef.current)}
                  aria-label="Onderwerp"
                  className="inline font-semibold text-[#17171a]"
                />
              </div>
              <hr className="mb-3 border-[#e5e5ea]" />
              <VariableEditor
                ref={bodyRef}
                initialValue={bodyHtml}
                variables={variables}
                mode="html"
                onChange={setBodyHtml}
                onFocus={() => (activeEditorRef.current = bodyRef.current)}
                aria-label="Inhoud"
                className="text-sm leading-relaxed [&_p]:my-2"
              />
              <div className="my-3">
                <input
                  value={ctaLabel}
                  onChange={(e) => setCtaLabel(e.target.value)}
                  aria-label="Knoptekst"
                  className="rounded-lg bg-voc-red px-5 py-2.5 text-sm font-bold text-white outline-none focus-visible:ring-2 focus-visible:ring-voc-red/40"
                />
              </div>
              <VariableEditor
                ref={afterRef}
                initialValue={afterHtml}
                variables={variables}
                mode="html"
                onChange={setAfterHtml}
                onFocus={() => (activeEditorRef.current = afterRef.current)}
                aria-label="Tekst na de knop"
                className="text-sm leading-relaxed [&_p]:my-2"
              />
              <div className="mt-4 border-t border-dashed border-[#e5e5ea] pt-3 text-xs text-[#67625b]">
                Handtekening: {signatureType === "pers" ? "persoonlijk" : "algemeen (VOC)"} - komt er automatisch onder, hier niet te bewerken.
              </div>
            </div>

            <div className="max-w-xs">
              <label htmlFor={`${formId}-sig`} className="mb-1.5 block text-sm font-medium text-foreground">
                Handtekening onder deze mail
              </label>
              <Select
                id={`${formId}-sig`}
                value={signatureType}
                onChange={(e) => setSignatureType(e.target.value === "pers" ? "pers" : "alg")}
                className="h-10 w-full pl-3"
              >
                <option value="alg">Algemeen (VOC)</option>
                <option value="pers">Persoonlijk</option>
              </Select>
            </div>
          </div>
        ) : (
          <div className="mt-4 flex flex-col gap-3">
            <div>
              <label htmlFor={`${formId}-pt`} className="mb-1.5 block text-sm font-medium text-foreground">
                Titel
              </label>
              <Input id={`${formId}-pt`} value={pushTitle} onChange={(e) => setPushTitle(e.target.value)} />
            </div>
            <div>
              <label htmlFor={`${formId}-pb`} className="mb-1.5 block text-sm font-medium text-foreground">
                Tekst
              </label>
              <Input id={`${formId}-pb`} value={pushBody} onChange={(e) => setPushBody(e.target.value)} />
            </div>
            <p className="text-xs text-muted">Zo ziet het eruit op een telefoon. Houd het kort: na ongeveer 90 tekens wordt de tekst afgekapt.</p>
            <div className="flex items-start gap-3 rounded-2xl bg-[#f2f2f4] p-3">
              <div className="h-9 w-9 shrink-0 rounded-lg bg-white" />
              <div>
                <p className="text-sm font-semibold text-[#1d1d1f]">{pushTitle || "…"}</p>
                <p className="text-[13.5px] text-[#1d1d1f]">{pushBody || "…"}</p>
              </div>
            </div>
          </div>
        )}
      </div>

      <input type="hidden" name="subject" form={formId} value={subject} />
      <input type="hidden" name="body_html" form={formId} value={bodyHtml} />
      <input type="hidden" name="cta_label" form={formId} value={ctaLabel} />
      <input type="hidden" name="after_html" form={formId} value={afterHtml} />
      <input type="hidden" name="signature_type" form={formId} value={signatureType} />
      {template.has_push && (
        <>
          <input type="hidden" name="push_title" form={formId} value={pushTitle} />
          <input type="hidden" name="push_body" form={formId} value={pushBody} />
        </>
      )}

      <form id={formId} action={updateAction} className="flex flex-wrap items-center gap-2 rounded-2xl bg-surface p-4 shadow-sm">
        <span className="mr-auto text-xs text-muted">Laatst gewijzigd: {formatDateNumeric(template.updated_at)}</span>
        <button
          type="submit"
          formAction={resetAction}
          className="rounded-full border border-border bg-surface px-3 py-1.5 text-xs font-medium text-foreground hover:bg-black/[.03] dark:hover:bg-white/[.06]"
        >
          Standaardtekst terugzetten
        </button>
        <SecondaryButton formAction={testAction} pendingLabel="Versturen…">
          Testmail naar mij
        </SecondaryButton>
        <SaveButton />
      </form>
    </div>
  );
}
