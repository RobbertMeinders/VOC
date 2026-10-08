"use client";

import { useActionState, useEffect, useRef } from "react";
import { useFormStatus } from "react-dom";
import Image from "next/image";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { FileSelectButton } from "@/components/ui/FileSelectButton";
import {
  updateAppSettingsAction,
  uploadAppLogoAction,
  removeAppLogoAction,
  type UpdateAppSettingsState,
  type UploadAppLogoState,
} from "@/app/(app)/beheer/instellingen/actions";
import { useToast } from "@/lib/ui/ToastContext";
import type { AppSettings } from "@/lib/settings/app-settings";

const initialState: UpdateAppSettingsState = {};
const uploadInitialState: UploadAppLogoState = {};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Opslaan…" : "Opslaan"}
    </Button>
  );
}

function UploadButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant="secondary" disabled={pending}>
      {pending ? "Uploaden…" : "Logo uploaden"}
    </Button>
  );
}

function LogoUpload({ currentLogoUrl }: { currentLogoUrl: string | null }) {
  const [state, formAction] = useActionState(uploadAppLogoAction, uploadInitialState);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.logoUrl) formRef.current?.reset();
  }, [state.logoUrl]);

  const previewUrl = state.logoUrl ?? currentLogoUrl ?? "/brand/voc-logo-mark.png";

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-4">
        <Image
          src={previewUrl}
          alt="Logo"
          width={56}
          height={56}
          unoptimized
          className="h-14 w-14 shrink-0 rounded-lg border border-border object-contain p-1.5"
        />
        <div className="flex min-w-0 flex-1 flex-col gap-1.5">
          <form ref={formRef} action={formAction} className="flex flex-wrap items-center gap-2">
            <FileSelectButton
              name="logo"
              accept="image/png,image/jpeg,image/webp,image/svg+xml"
              required
              label="Logo kiezen"
            />
            <UploadButton />
          </form>
          {(currentLogoUrl || state.logoUrl) && (
            <form action={removeAppLogoAction}>
              <button type="submit" className="text-xs font-medium text-muted hover:text-voc-red-text">
                Terug naar het standaardlogo
              </button>
            </form>
          )}
        </div>
      </div>
      {state.error && (
        <p role="alert" className="text-sm text-voc-red-text">
          {state.error}
        </p>
      )}
    </div>
  );
}

export function AppSettingsForm({ settings }: { settings: AppSettings }) {
  const [state, formAction] = useActionState(updateAppSettingsAction, initialState);
  const toast = useToast();

  useEffect(() => {
    if (state.success) toast("Opgeslagen.");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-2xl border border-border bg-surface p-6 shadow-sm">
        <h2 className="text-sm font-semibold text-foreground">Logo</h2>
        <p className="mt-1 text-xs text-muted">
          Verschijnt in de zijbalk/mobiele header van de app én bovenaan elke verstuurde nieuwsbrief.
        </p>
        <div className="mt-4">
          <LogoUpload currentLogoUrl={settings.logo_url} />
        </div>
      </div>

      <form action={formAction} className="rounded-2xl border border-border bg-surface p-6 shadow-sm">
        <h2 className="text-sm font-semibold text-foreground">Naam</h2>
        <div className="mt-4 flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="site_name" className="text-sm font-medium text-foreground">
              Naam van het ledenportaal
            </label>
            <p className="text-xs text-muted">Browsertab, app-naam op het beginscherm, titel in e-mails.</p>
            <Input id="site_name" name="site_name" defaultValue={settings.site_name} required className="h-11 text-base" />
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="org_name" className="text-sm font-medium text-foreground">
              Naam van de vereniging
            </label>
            <p className="text-xs text-muted">Gebruikt in de voettekst van nieuwsbrieven en automatische e-mailmeldingen.</p>
            <Input id="org_name" name="org_name" defaultValue={settings.org_name} required className="h-11 text-base" />
          </div>
        </div>

        {state.error && (
          <p role="alert" className="mt-4 rounded-lg bg-voc-red-light px-3 py-2 text-sm text-voc-red-text">
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
