"use client";

import { useActionState, useEffect, useRef } from "react";
import { useFormStatus } from "react-dom";
import Image from "next/image";
import { Button } from "@/components/ui/Button";
import { FileSelectButton } from "@/components/ui/FileSelectButton";
import { FormSection, FormSections } from "@/components/ui/FormSection";
import {
  removeOrgHeaderImageAction,
  updateOrgProfileAction,
  uploadOrgHeaderImageAction,
  type UpdateOrgProfileState,
  type UploadOrgHeaderImageState,
} from "@/app/(app)/beheer/vereniging/over-ons/actions";
import { useToast } from "@/lib/ui/ToastContext";
import type { OrgProfile } from "@/lib/settings/org-profile";
import { Textarea } from "@/components/ui/Textarea";

const initialState: UpdateOrgProfileState = {};
const uploadInitialState: UploadOrgHeaderImageState = {};

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
    <Button type="submit" variant="secondary" size="sm" disabled={pending}>
      {pending ? "Uploaden…" : "Foto uploaden"}
    </Button>
  );
}

// Optionele headerfoto bovenaan de pagina Over de VOC — zelfde
// upload+opslaan-in-één-stap-patroon als het portaallogo (AppSettingsForm).
function HeaderImageUpload({ currentImageUrl }: { currentImageUrl: string | null }) {
  const [state, formAction] = useActionState(uploadOrgHeaderImageAction, uploadInitialState);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.imagePath) formRef.current?.reset();
  }, [state.imagePath]);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-3">
        {currentImageUrl && (
          <div className="relative aspect-[21/9] w-32 shrink-0 overflow-hidden rounded-lg border border-border bg-black/5 dark:bg-white/5">
            <Image src={currentImageUrl} alt="" fill unoptimized className="object-cover" />
          </div>
        )}
        <div className="flex flex-wrap items-center gap-2">
          <form ref={formRef} action={formAction} className="flex flex-wrap items-center gap-2">
            <FileSelectButton name="image" accept="image/png,image/jpeg,image/webp,image/avif" required label="Foto kiezen" />
            <UploadButton />
          </form>
          {currentImageUrl && (
            <form action={removeOrgHeaderImageAction}>
              <button type="submit" className="text-xs font-medium text-muted hover:text-petrol">
                Foto verwijderen
              </button>
            </form>
          )}
        </div>
      </div>
      {state.error && (
        <p role="alert" className="text-sm text-danger-text">
          {state.error}
        </p>
      )}
    </div>
  );
}

export function OrgProfileForm({ orgProfile, headerImageUrl }: { orgProfile: OrgProfile; headerImageUrl: string | null }) {
  const [state, formAction] = useActionState(updateOrgProfileAction, initialState);
  const toast = useToast();

  useEffect(() => {
    if (state.success) toast("Opgeslagen.");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-2xl bg-surface p-6 shadow-sm">
        <h2 className="text-sm font-semibold text-foreground">Headerfoto</h2>
        <p className="mt-1 text-xs text-muted">Verschijnt bovenaan de pagina Over de vereniging. Optioneel. Zonder foto blijft het bij tekst.</p>
        <div className="mt-4">
          <HeaderImageUpload currentImageUrl={headerImageUrl} />
        </div>
      </div>

      <form action={formAction} className="rounded-2xl bg-surface p-6 shadow-sm">
        <FormSections>
          <FormSection label="Introductie" description="Een korte, uitnodigende opening bovenaan de pagina Over de vereniging.">
            <Textarea
              name="intro_text"
              aria-label="Introductie"
              rows={4}
              defaultValue={orgProfile.intro_text ?? ""}
              placeholder="Nog niet ingevuld. Leden zien dit pas als hier tekst staat."
            />
          </FormSection>
          <FormSection label="Missie" description="Waar staat VOC voor, wat is het doel van de vereniging?">
            <Textarea
              name="mission_text"
              aria-label="Missie"
              rows={4}
              defaultValue={orgProfile.mission_text ?? ""}
              placeholder="Nog niet ingevuld. Leden zien dit pas als hier tekst staat."
            />
          </FormSection>
          <FormSection label="Visie" description="Welke toekomst streeft VOC voor haar leden en de regio na?">
            <Textarea
              name="vision_text"
              aria-label="Visie"
              rows={4}
              defaultValue={orgProfile.vision_text ?? ""}
              placeholder="Nog niet ingevuld. Leden zien dit pas als hier tekst staat."
            />
          </FormSection>
        </FormSections>

        {state.error && (
          <p role="alert" className="mt-4 rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger-text">
            {state.error}
          </p>
        )}
        <div className="mt-5">
          <SubmitButton />
        </div>
      </form>
    </div>
  );
}
