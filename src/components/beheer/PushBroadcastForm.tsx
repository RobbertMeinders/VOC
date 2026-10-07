"use client";

import { useActionState, useRef } from "react";
import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { sendPushBroadcastAction, type PushBroadcastState } from "@/app/(app)/beheer/pushbericht/actions";
import { useConfirm } from "@/lib/ui/ConfirmDialogContext";

const initialState: PushBroadcastState = {};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Versturen…" : "Stuur pushbericht"}
    </Button>
  );
}

export function PushBroadcastForm() {
  const [state, formAction] = useActionState(sendPushBroadcastAction, initialState);
  const formRef = useRef<HTMLFormElement>(null);
  const confirmedRef = useRef(false);
  const confirm = useConfirm();

  return (
    <form
      ref={formRef}
      action={formAction}
      onSubmit={(e) => {
        if (confirmedRef.current) {
          confirmedRef.current = false;
          return;
        }
        e.preventDefault();
        void confirm({
          title: "Pushbericht versturen?",
          description: "Dit gaat direct naar alle abonnees.",
          confirmLabel: "Versturen",
          danger: true,
        }).then((confirmed) => {
          if (confirmed) {
            confirmedRef.current = true;
            formRef.current?.requestSubmit();
          }
        });
      }}
      className="flex flex-col gap-4 rounded-2xl border border-border bg-surface p-6 shadow-sm"
    >
      <div className="flex flex-col gap-1.5">
        <label htmlFor="push-title" className="text-sm font-medium text-foreground">
          Titel
        </label>
        <Input id="push-title" name="title" required />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="push-message" className="text-sm font-medium text-foreground">
          Bericht
        </label>
        <textarea
          id="push-message"
          name="message"
          rows={4}
          required
          className="rounded-lg border border-input-border bg-background px-3 py-2 text-sm text-foreground focus:border-voc-red focus:outline-none focus:ring-2 focus:ring-voc-red/20"
        />
      </div>

      {state.error && (
        <p role="alert" className="rounded-lg bg-voc-red-light px-3 py-2 text-sm text-voc-red-text">
          {state.error}
        </p>
      )}
      {state.sent !== undefined && (
        <p className="text-sm text-green-600">
          {state.sent} van {state.total} abonnementen bereikt.
        </p>
      )}

      <div>
        <SubmitButton />
      </div>
    </form>
  );
}
