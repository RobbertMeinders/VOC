"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { updatePushTemplateAction, type UpdatePushTemplateState } from "@/app/(app)/beheer/email-templates/actions";
import type { Database } from "@/lib/types/database";

type PushTemplate = Database["public"]["Tables"]["push_templates"]["Row"];

const initialState: UpdatePushTemplateState = {};

// Voorbeeldwaarden voor de preview — een echte push vult {{title}}/{{body}}
// met de titel/tekst van de notificatie zelf.
const PREVIEW_VARIABLES: Record<string, string> = {
  title: "Nieuwe activiteit: Netwerkborrel",
  body: "Er is een nieuwe activiteit gepland. Bekijk de details en meld je aan.",
};

function renderPreview(template: string) {
  return Object.entries(PREVIEW_VARIABLES).reduce(
    (text, [key, value]) => text.replaceAll(`{{${key}}}`, value),
    template
  );
}

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

  return (
    <form action={formAction} className="rounded-2xl border border-border bg-surface p-6 shadow-sm">
      <h2 className="text-sm font-semibold text-foreground">{template.key}</h2>
      {template.description && <p className="mb-4 mt-1 text-xs text-muted">{template.description}</p>}

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <label htmlFor={`push-title-${template.key}`} className="text-sm font-medium text-foreground">
              Titel
            </label>
            <Input id={`push-title-${template.key}`} name="title" value={title} onChange={(e) => setTitle(e.target.value)} required />
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor={`push-body-${template.key}`} className="text-sm font-medium text-foreground">
              Bericht
            </label>
            <textarea
              id={`push-body-${template.key}`}
              name="body"
              rows={4}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              required
              className="rounded-lg border border-border bg-background px-3 py-2 font-mono text-xs text-foreground focus:border-voc-red focus:outline-none focus:ring-2 focus:ring-voc-red/20"
            />
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <p className="text-sm font-medium text-foreground">Voorbeeld</p>
          <div className="flex min-h-[120px] items-start gap-3 rounded-lg border border-border bg-white p-4 shadow-sm">
            <div className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full bg-voc-red-light text-voc-red">
              <Bell size={16} />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium text-[#17171a]">{renderPreview(title)}</p>
              <p className="mt-0.5 text-sm text-[#6b6b72]">{renderPreview(body)}</p>
            </div>
          </div>
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
