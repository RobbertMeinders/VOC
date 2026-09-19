"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import Image from "next/image";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { compressInputFile } from "@/lib/image/compress";
import type { ActivityFormState } from "@/app/(app)/agenda/actions";
import type { Database } from "@/lib/types/database";

type Activity = Database["public"]["Tables"]["activities"]["Row"];

const initialState: ActivityFormState = {};

// datetime-local wants "YYYY-MM-DDTHH:mm" in the viewer's own wall-clock
// time, with no timezone info — converting to/from ISO must happen in the
// browser (not the server action) or a UTC-timezoned server would shift it.
function toLocalInputValue(iso: string | null): string {
  if (!iso) return "";
  const date = new Date(iso);
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 16);
}

function DateTimeField({
  label,
  name,
  defaultValue,
  required,
}: {
  label: string;
  name: string;
  defaultValue: string | null;
  required?: boolean;
}) {
  const [value, setValue] = useState(toLocalInputValue(defaultValue));
  const iso = value ? new Date(value).toISOString() : "";

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={name} className="text-sm font-medium text-foreground">
        {label}
      </label>
      <Input
        id={name}
        type="datetime-local"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        required={required}
      />
      <input type="hidden" name={name} value={iso} />
    </div>
  );
}

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Opslaan…" : label}
    </Button>
  );
}

export function ActivityForm({
  activity,
  action,
  submitLabel,
  imageUrl,
}: {
  activity?: Activity;
  action: (prevState: ActivityFormState, formData: FormData) => Promise<ActivityFormState>;
  submitLabel: string;
  imageUrl?: string | null;
}) {
  const [state, formAction] = useActionState(action, initialState);
  const [preview, setPreview] = useState<string | null>(null);
  const shownImage = preview ?? imageUrl;

  return (
    <form action={formAction} className="flex flex-col gap-5">
      <div className="flex flex-col gap-1.5">
        <label htmlFor="title" className="text-sm font-medium text-foreground">
          Titel
        </label>
        <Input id="title" name="title" defaultValue={activity?.title} required />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="description" className="text-sm font-medium text-foreground">
          Beschrijving
        </label>
        <textarea
          id="description"
          name="description"
          rows={4}
          defaultValue={activity?.description ?? ""}
          className="rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground placeholder:text-muted focus:border-voc-red focus:outline-none focus:ring-2 focus:ring-voc-red/20"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="location" className="text-sm font-medium text-foreground">
          Locatie
        </label>
        <Input id="location" name="location" defaultValue={activity?.location ?? ""} />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <DateTimeField label="Start" name="starts_at" defaultValue={activity?.starts_at ?? null} required />
        <DateTimeField label="Einde (optioneel)" name="ends_at" defaultValue={activity?.ends_at ?? null} />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <DateTimeField
          label="Aanmelddeadline (optioneel)"
          name="registration_deadline"
          defaultValue={activity?.registration_deadline ?? null}
        />
        <div className="flex flex-col gap-1.5">
          <label htmlFor="max_participants" className="text-sm font-medium text-foreground">
            Maximum deelnemers
          </label>
          <Input
            id="max_participants"
            name="max_participants"
            type="number"
            min={1}
            defaultValue={activity?.max_participants ?? ""}
            placeholder="Onbeperkt"
          />
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="image" className="text-sm font-medium text-foreground">
          Afbeelding
        </label>
        {shownImage && (
          <Image src={shownImage} alt="" width={160} height={100} className="h-[100px] w-[160px] rounded-lg object-cover" />
        )}
        <input
          id="image"
          name="image"
          type="file"
          accept="image/png,image/jpeg,image/webp"
          onChange={async (e) => {
            const input = e.target;
            const compressed = await compressInputFile(input);
            if (compressed) setPreview(URL.createObjectURL(compressed));
          }}
          className="text-sm text-foreground file:mr-3 file:cursor-pointer file:rounded-full file:border-0 file:bg-voc-red-light file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-voc-red hover:file:bg-voc-red/20"
        />
      </div>

      {state.error && (
        <p role="alert" className="rounded-lg bg-voc-red-light px-3 py-2 text-sm text-voc-red">
          {state.error}
        </p>
      )}
      {state.success && <p className="text-sm text-green-600">Opgeslagen.</p>}

      <div>
        <SubmitButton label={submitLabel} />
      </div>
    </form>
  );
}
