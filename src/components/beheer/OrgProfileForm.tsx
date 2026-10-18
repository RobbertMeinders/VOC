"use client";

import { useActionState, useEffect } from "react";
import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/Button";
import { FormSection, FormSections } from "@/components/ui/FormSection";
import { updateOrgProfileAction, type UpdateOrgProfileState } from "@/app/(app)/beheer/vereniging/over-ons/actions";
import { useToast } from "@/lib/ui/ToastContext";
import type { OrgProfile } from "@/lib/settings/org-profile";

const initialState: UpdateOrgProfileState = {};

const TEXTAREA_CLASS =
  "rounded-lg border border-input-border bg-surface px-3 py-2 text-sm text-foreground placeholder:text-muted focus:border-voc-red focus:outline-none focus:ring-2 focus:ring-voc-red/20";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Opslaan…" : "Opslaan"}
    </Button>
  );
}

export function OrgProfileForm({ orgProfile }: { orgProfile: OrgProfile }) {
  const [state, formAction] = useActionState(updateOrgProfileAction, initialState);
  const toast = useToast();

  useEffect(() => {
    if (state.success) toast("Opgeslagen.");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  return (
    <form action={formAction} className="rounded-2xl border border-border bg-surface p-6 shadow-sm">
      <FormSections>
        <FormSection label="Introductie" description="Een korte, uitnodigende opening bovenaan de pagina Over de vereniging.">
          <textarea
            name="intro_text"
            rows={4}
            defaultValue={orgProfile.intro_text ?? ""}
            placeholder="Nog niet ingevuld — leden zien dit onderdeel pas zodra hier tekst staat."
            className={TEXTAREA_CLASS}
          />
        </FormSection>
        <FormSection label="Missie" description="Waar staat VOC voor, wat is het doel van de vereniging?">
          <textarea
            name="mission_text"
            rows={4}
            defaultValue={orgProfile.mission_text ?? ""}
            placeholder="Nog niet ingevuld — leden zien dit onderdeel pas zodra hier tekst staat."
            className={TEXTAREA_CLASS}
          />
        </FormSection>
        <FormSection label="Visie" description="Welke toekomst streeft VOC voor haar leden en de regio na?">
          <textarea
            name="vision_text"
            rows={4}
            defaultValue={orgProfile.vision_text ?? ""}
            placeholder="Nog niet ingevuld — leden zien dit onderdeel pas zodra hier tekst staat."
            className={TEXTAREA_CLASS}
          />
        </FormSection>
      </FormSections>

      {state.error && (
        <p role="alert" className="mt-4 rounded-lg bg-voc-red-light px-3 py-2 text-sm text-voc-red-text">
          {state.error}
        </p>
      )}
      <div className="mt-5">
        <SubmitButton />
      </div>
    </form>
  );
}
