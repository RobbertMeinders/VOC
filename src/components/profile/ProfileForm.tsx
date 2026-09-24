"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { Camera } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Avatar } from "@/components/ui/Avatar";
import { Switch } from "@/components/ui/Switch";
import { updateProfileAction, type UpdateProfileState } from "@/app/(app)/profiel/actions";
import { compressInputFile } from "@/lib/image/compress";
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
  const [showPhone, setShowPhone] = useState(profile.show_phone);
  const [showEmail, setShowEmail] = useState(profile.show_email);

  return (
    <form action={formAction} className="flex flex-col gap-5">
      <div className="flex items-center gap-4">
        <div className="relative">
          <Avatar
            firstName={profile.first_name}
            lastName={profile.last_name}
            avatarUrl={preview ?? avatarUrl}
            size={72}
          />
          <label
            htmlFor="avatar"
            className="absolute -bottom-1 -right-1 flex h-7 w-7 cursor-pointer items-center justify-center rounded-full bg-voc-red text-white shadow-sm hover:bg-voc-red-dark"
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
              if (compressed) setPreview(URL.createObjectURL(compressed));
            }}
          />
        </div>
        <p className="text-xs text-muted">Klik op het camera-icoon om een profielfoto te uploaden.</p>
      </div>

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
          className="rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground placeholder:text-muted focus:border-voc-red focus:outline-none focus:ring-2 focus:ring-voc-red/20"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="phone" className="text-sm font-medium text-foreground">
          Telefoonnummer
        </label>
        <Input id="phone" name="phone" type="tel" defaultValue={profile.phone ?? ""} />
        <div className="flex items-center gap-2">
          <input type="hidden" name="show_phone" value={showPhone ? "on" : ""} />
          <Switch checked={showPhone} onChange={() => setShowPhone((v) => !v)} label="Telefoonnummer zichtbaar voor andere leden" />
          <span className="text-xs text-muted">Zichtbaar voor andere leden</span>
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <span className="text-sm font-medium text-foreground">E-mailadres</span>
        <p className="text-sm text-muted">{profile.email}</p>
        <div className="flex items-center gap-2">
          <input type="hidden" name="show_email" value={showEmail ? "on" : ""} />
          <Switch checked={showEmail} onChange={() => setShowEmail((v) => !v)} label="E-mailadres zichtbaar voor andere leden" />
          <span className="text-xs text-muted">Zichtbaar voor andere leden</span>
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="linkedin_url" className="text-sm font-medium text-foreground">
          LinkedIn
        </label>
        <Input
          id="linkedin_url"
          name="linkedin_url"
          type="url"
          defaultValue={profile.linkedin_url ?? ""}
          placeholder="https://www.linkedin.com/in/..."
        />
      </div>

      {state.error && (
        <p role="alert" className="rounded-lg bg-voc-red-light px-3 py-2 text-sm text-voc-red">
          {state.error}
        </p>
      )}
      {state.success && <p className="text-sm text-green-600">Opgeslagen.</p>}

      <div>
        <SubmitButton />
      </div>
    </form>
  );
}
