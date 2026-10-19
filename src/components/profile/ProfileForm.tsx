"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import { Camera } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Avatar } from "@/components/ui/Avatar";
import { Switch } from "@/components/ui/Switch";
import { FieldError } from "@/components/ui/FieldError";
import { FormErrorSummary } from "@/components/ui/FormErrorSummary";
import { FormSection, FormSections, FormToggleRow } from "@/components/ui/FormSection";
import { updateProfileAction, type UpdateProfileState } from "@/app/(app)/profiel/actions";
import { compressInputFile, createThumbnailFile } from "@/lib/image/compress";
import { useToast } from "@/lib/ui/ToastContext";
import { useFieldValidation } from "@/lib/validation/useFieldValidation";
import { validateUrl } from "@/lib/validation/fields";
import type { Profile } from "@/lib/auth/session";

const initialState: UpdateProfileState = {};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Opslaan…" : "Opslaan"}
    </Button>
  );
}

export function ProfileForm({
  profile,
  avatarUrl,
  action = updateProfileAction,
}: {
  profile: Profile;
  avatarUrl: string | null;
  action?: (prevState: UpdateProfileState, formData: FormData) => Promise<UpdateProfileState>;
}) {
  const [state, formAction] = useActionState(action, initialState);
  const [preview, setPreview] = useState<string | null>(null);
  const avatarThumbInputRef = useRef<HTMLInputElement>(null);
  const [showPhone, setShowPhone] = useState(profile.show_phone);
  const [showEmail, setShowEmail] = useState(profile.show_email);
  const toast = useToast();
  const { errors, validateField, validateAll } = useFieldValidation({
    linkedin_url: (value) => validateUrl(value),
  });

  // UX-review U4: "Opgeslagen." stond als kleine groene tekst onderaan het
  // formulier — bij dit lange formulier op mobiel vaak buiten beeld. Toast
  // i.p.v. inline tekst zodat het altijd zichtbaar is.
  useEffect(() => {
    if (state.success) toast("Opgeslagen.");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  return (
    <form
      action={formAction}
      onSubmit={(e) => {
        if (!validateAll(new FormData(e.currentTarget))) e.preventDefault();
      }}
      className="flex flex-col gap-5"
    >
      <FormErrorSummary errors={errors} />
      <div className="flex items-center gap-4">
        <div className="relative shrink-0">
          <Avatar
            firstName={profile.first_name}
            lastName={profile.last_name}
            avatarUrl={preview ?? avatarUrl}
            size={72}
          />
          <label
            htmlFor="avatar"
            className="absolute -bottom-1 -right-1 flex h-7 w-7 cursor-pointer items-center justify-center rounded-full bg-petrol text-white shadow-sm hover:opacity-90"
          >
            <Camera size={14} />
          </label>
          <input
            id="avatar"
            name="avatar"
            type="file"
            accept="image/png,image/jpeg,image/webp,image/svg+xml,image/avif"
            className="sr-only"
            onChange={async (e) => {
              const input = e.target;
              const compressed = await compressInputFile(input);
              if (!compressed) return;
              setPreview(URL.createObjectURL(compressed));

              // Klein tweede bestand voor de ledenlijst e.d. (performance-
              // audit #1) — meegestuurd via een los, verborgen file-input
              // i.p.v. een extra formulierveld dat iemand zelf zou moeten
              // invullen.
              const thumbInput = avatarThumbInputRef.current;
              if (thumbInput) {
                const thumb = await createThumbnailFile(compressed);
                const transfer = new DataTransfer();
                if (thumb) transfer.items.add(thumb);
                thumbInput.files = transfer.files;
              }
            }}
          />
          <input ref={avatarThumbInputRef} type="file" name="avatar_thumb" className="hidden" tabIndex={-1} aria-hidden="true" />
        </div>
        <p className="text-xs text-muted">Klik op het camera-icoon om een profielfoto te uploaden.</p>
      </div>

      <FormSections>
        <FormSection label="Profiel">
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="first_name" className="text-sm font-medium text-foreground">
                Voornaam
              </label>
              <Input id="first_name" name="first_name" defaultValue={profile.first_name} required />
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="last_name" className="text-sm font-medium text-foreground">
                Achternaam
              </label>
              <Input id="last_name" name="last_name" defaultValue={profile.last_name} required />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="job_title" className="text-sm font-medium text-foreground">
              Functie
            </label>
            <Input id="job_title" name="job_title" defaultValue={profile.job_title ?? ""} />
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="bio" className="text-sm font-medium text-foreground">
              Over mij
            </label>
            <textarea
              id="bio"
              name="bio"
              rows={4}
              defaultValue={profile.bio ?? ""}
              placeholder="Vertel iets over jezelf..."
              className="rounded-lg border border-input-border bg-surface px-3 py-2 text-sm text-foreground placeholder:text-muted focus:border-voc-red focus:outline-none focus:ring-2 focus:ring-voc-red/20"
            />
          </div>
        </FormSection>

        <FormSection label="Contact">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="phone" className="text-sm font-medium text-foreground">
              Telefoonnummer
            </label>
            <Input id="phone" name="phone" type="tel" defaultValue={profile.phone ?? ""} />
          </div>

          <div className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-foreground">E-mailadres</span>
            <p className="text-sm text-muted">{profile.email}</p>
          </div>

          <FormToggleRow label="Telefoonnummer zichtbaar voor andere leden">
            <input type="hidden" name="show_phone" value={showPhone ? "on" : ""} />
            <Switch checked={showPhone} onChange={() => setShowPhone((v) => !v)} label="Telefoonnummer zichtbaar voor andere leden" />
          </FormToggleRow>
          <FormToggleRow label="E-mailadres zichtbaar voor andere leden">
            <input type="hidden" name="show_email" value={showEmail ? "on" : ""} />
            <Switch checked={showEmail} onChange={() => setShowEmail((v) => !v)} label="E-mailadres zichtbaar voor andere leden" />
          </FormToggleRow>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="linkedin_url" className="text-sm font-medium text-foreground">
              LinkedIn
            </label>
            <Input
              id="linkedin_url"
              name="linkedin_url"
              type="text"
              inputMode="url"
              defaultValue={profile.linkedin_url ?? ""}
              placeholder="https://www.linkedin.com/in/..."
              invalid={Boolean(errors.linkedin_url)}
              onBlur={(e) => validateField("linkedin_url", e.target.value)}
            />
            <FieldError message={errors.linkedin_url} />
          </div>
        </FormSection>
      </FormSections>

      {state.error && (
        <p role="alert" className="rounded-lg bg-voc-red-light px-3 py-2 text-sm text-voc-red-text">
          {state.error}
        </p>
      )}
      <div>
        <SubmitButton />
      </div>
    </form>
  );
}
