"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import { AlertTriangle, Lightbulb, Paperclip } from "lucide-react";
import { clsx } from "clsx";
import { Button } from "@/components/ui/Button";
import { FileSelectButton } from "@/components/ui/FileSelectButton";
import { submitTestfaseFeedbackAction, type SubmitTestfaseFeedbackState } from "@/app/(app)/testfase/actions";

const initialState: SubmitTestfaseFeedbackState = {};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Versturen…" : "Versturen"}
    </Button>
  );
}

// `van` komt van de aanroeper mee (bv. de regel bij een activiteit:
// /testfase?van=/agenda/kennissessie) — zonder dat valt dit terug op
// document.referrer, alleen client-side beschikbaar, vandaar de hidden
// inputs i.p.v. dit server-side al klaarzetten.
export function TestfaseFeedbackForm({ van }: { van?: string }) {
  const [state, formAction] = useActionState(submitTestfaseFeedbackAction, initialState);
  const [type, setType] = useState<"probleem" | "idee">("probleem");
  const [fileName, setFileName] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const pageRef = useRef<HTMLInputElement>(null);
  const userAgentRef = useRef<HTMLInputElement>(null);
  const screenWidthRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (pageRef.current) pageRef.current.value = van || document.referrer || window.location.pathname;
    if (userAgentRef.current) userAgentRef.current.value = navigator.userAgent;
    if (screenWidthRef.current) screenWidthRef.current.value = String(window.innerWidth);
  }, [van]);

  if (state.success) {
    return (
      <div className="rounded-2xl bg-surface p-6 text-center shadow-sm">
        <p className="text-sm font-medium text-foreground">Bedankt, we lezen alles.</p>
      </div>
    );
  }

  return (
    <form ref={formRef} action={formAction} className="flex flex-col gap-4 rounded-2xl bg-surface p-6 shadow-sm">
      <input ref={pageRef} type="hidden" name="page" />
      <input ref={userAgentRef} type="hidden" name="user_agent" />
      <input ref={screenWidthRef} type="hidden" name="screen_width" />

      <div className="flex gap-2">
        <input type="hidden" name="type" value={type} />
        <button
          type="button"
          onClick={() => setType("probleem")}
          className={clsx(
            "flex flex-1 items-center justify-center gap-1.5 rounded-xl border px-3 py-2.5 text-sm font-medium transition-colors",
            type === "probleem" ? "border-voc-red bg-danger-soft text-danger-text" : "border-border text-foreground hover:bg-black/[.03] dark:hover:bg-white/[.06]"
          )}
        >
          <AlertTriangle size={15} />
          Iets melden
        </button>
        <button
          type="button"
          onClick={() => setType("idee")}
          className={clsx(
            "flex flex-1 items-center justify-center gap-1.5 rounded-xl border px-3 py-2.5 text-sm font-medium transition-colors",
            type === "idee" ? "border-petrol bg-petrol-soft text-petrol" : "border-border text-foreground hover:bg-black/[.03] dark:hover:bg-white/[.06]"
          )}
        >
          <Lightbulb size={15} />
          Suggestie delen
        </button>
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="message" className="text-sm font-medium text-foreground">
          Vertel het kort
        </label>
        <textarea
          id="message"
          name="message"
          required
          rows={4}
          placeholder="Bijvoorbeeld: mijn aanmelding staat niet in Mijn agenda."
          className="rounded-lg border border-input-border bg-surface px-3 py-2 text-sm text-foreground placeholder:text-muted focus:border-petrol focus:outline-none focus:ring-2 focus:ring-petrol/20"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <span className="text-sm font-medium text-foreground">Schermafbeelding toevoegen</span>
        <div className="flex items-center gap-2">
          <FileSelectButton
            name="screenshot"
            accept="image/png,image/jpeg,image/webp"
            label="Bestand kiezen"
            onChange={(e) => setFileName(e.target.files?.[0]?.name ?? null)}
          />
          {fileName && (
            <span className="flex min-w-0 items-center gap-1 truncate text-xs text-muted">
              <Paperclip size={12} className="shrink-0" />
              {fileName}
            </span>
          )}
        </div>
        <p className="text-xs text-muted">Optioneel. PNG, JPEG of WebP, max 5 MB.</p>
      </div>

      <p className="text-xs text-muted">We sturen automatisch mee op welke pagina je was en welk apparaat je gebruikt.</p>

      {state.error && (
        <p role="alert" className="rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger-text">
          {state.error}
        </p>
      )}

      <div>
        <SubmitButton />
      </div>
    </form>
  );
}
