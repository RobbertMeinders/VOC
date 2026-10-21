"use client";

import { useActionState, useEffect } from "react";
import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import {
  updateSignatureSettingsAction,
  sendTestSignatureEmailAction,
  type UpdateSignatureSettingsState,
  type SendTestSignatureState,
} from "@/app/(app)/beheer/instellingen/message-templates-actions";
import { useToast } from "@/lib/ui/ToastContext";
import type { AppSettings } from "@/lib/settings/app-settings";

const updateInitial: UpdateSignatureSettingsState = {};
const testInitial: SendTestSignatureState = {};

function SaveButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="sm" disabled={pending}>
      {pending ? "Opslaan…" : "Opslaan"}
    </Button>
  );
}

function TestButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-full border border-border bg-surface px-3 py-1.5 text-xs font-medium text-foreground hover:bg-black/[.03] disabled:opacity-60 dark:hover:bg-white/[.06]"
    >
      {pending ? "Versturen…" : "Testmail naar mij"}
    </button>
  );
}

export function SignaturesEditor({ settings }: { settings: AppSettings }) {
  const toast = useToast();
  const [updateState, updateAction] = useActionState(updateSignatureSettingsAction, updateInitial);
  const [testState, testAction] = useActionState(sendTestSignatureEmailAction, testInitial);

  useEffect(() => {
    if (updateState.success) toast("Opgeslagen.");
    if (updateState.error) toast(updateState.error, "error");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [updateState]);
  useEffect(() => {
    if (testState.success) toast("Testmail verstuurd naar je eigen e-mailadres.");
    if (testState.error) toast(testState.error, "error");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [testState]);

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-2xl bg-surface p-5 shadow-sm">
        <h3 className="font-display text-lg font-bold text-foreground">Handtekeningen</h3>
        <p className="mt-1 text-sm text-muted">Staan automatisch onder elke mail. Hier pas je ze één keer aan.</p>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl border border-border p-3">
            <p className="text-sm font-semibold text-foreground">Algemeen</p>
            <p className="mt-0.5 text-xs text-muted">
              Onder alle automatische mails waar &apos;Algemeen&apos; is gekozen. Logo, verenigingsnaam, e-mailadres en website komen
              automatisch uit Portaalinstellingen en de verzendconfiguratie - niets om hier los in te vullen.
            </p>
          </div>
          <div className="rounded-xl border border-border p-3">
            <p className="text-sm font-semibold text-foreground">Persoonlijk</p>
            <p className="mt-0.5 text-xs text-muted">Alleen waar je die kiest, zoals bij de uitnodiging voor nieuwe leden.</p>
          </div>
        </div>

        <form action={updateAction} className="mt-4 flex flex-col gap-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label htmlFor="signature_personal_name" className="mb-1.5 block text-sm font-medium text-foreground">
                Naam
              </label>
              <Input id="signature_personal_name" name="signature_personal_name" defaultValue={settings.signature_personal_name ?? ""} />
            </div>
            <div>
              <label htmlFor="signature_personal_role" className="mb-1.5 block text-sm font-medium text-foreground">
                Functie
              </label>
              <Input id="signature_personal_role" name="signature_personal_role" defaultValue={settings.signature_personal_role ?? ""} />
            </div>
            <div>
              <label htmlFor="signature_personal_phone" className="mb-1.5 block text-sm font-medium text-foreground">
                Telefoon
              </label>
              <Input id="signature_personal_phone" name="signature_personal_phone" defaultValue={settings.signature_personal_phone ?? ""} />
            </div>
            <div>
              <label htmlFor="signature_personal_email" className="mb-1.5 block text-sm font-medium text-foreground">
                E-mailadres
              </label>
              <Input
                id="signature_personal_email"
                name="signature_personal_email"
                type="email"
                defaultValue={settings.signature_personal_email ?? ""}
              />
            </div>
          </div>
          <p className="text-xs text-muted">Zonder ingevulde naam valt de persoonlijke handtekening terug op de algemene.</p>
          <div className="flex items-center gap-2">
            <SaveButton />
          </div>
        </form>
      </div>

      <form action={testAction} className="flex justify-end">
        <TestButton />
      </form>
    </div>
  );
}
