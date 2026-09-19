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

// Every conversion below is pinned to the fixed "Europe/Amsterdam" IANA zone
// via Intl, never the executing environment's own local offset (e.g.
// Date.prototype.getTimezoneOffset()). That matters because this value is
// computed once during server rendering and again during client hydration —
// a Vercel serverless function runs in UTC while the board member's browser
// runs in Europe/Amsterdam, so anything using the *local* offset produced a
// different string in each place and crashed with a hydration-mismatch
// error. Intl with an explicit timeZone is deterministic regardless of where
// it executes, so server and client always agree.
function amsterdamParts(iso: string) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Amsterdam",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(new Date(iso));
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "00";
  return { date: `${get("year")}-${get("month")}-${get("day")}`, time: `${get("hour")}:${get("minute")}` };
}

function toLocalInputValue(iso: string | null): string {
  if (!iso) return "";
  const { date, time } = amsterdamParts(iso);
  return `${date}T${time}`;
}

function toLocalTimeValue(iso: string | null): string {
  if (!iso) return "";
  return amsterdamParts(iso).time;
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

  const [startsAt, setStartsAt] = useState(toLocalInputValue(activity?.starts_at ?? null));
  const [endTime, setEndTime] = useState(toLocalTimeValue(activity?.ends_at ?? null));
  const [deadline, setDeadline] = useState(toLocalInputValue(activity?.registration_deadline ?? null));

  const startDatePart = startsAt.split("T")[0] ?? "";
  const startsAtIso = startsAt ? new Date(startsAt).toISOString() : "";
  const endsAtIso = startDatePart && endTime ? new Date(`${startDatePart}T${endTime}`).toISOString() : "";
  const deadlineIso = deadline ? new Date(deadline).toISOString() : "";

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
        <div className="flex flex-col gap-1.5">
          <label htmlFor="starts_at" className="text-sm font-medium text-foreground">
            Start
          </label>
          <Input
            id="starts_at"
            type="datetime-local"
            value={startsAt}
            onChange={(e) => setStartsAt(e.target.value)}
            required
          />
          <input type="hidden" name="starts_at" value={startsAtIso} />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="ends_at_time" className="text-sm font-medium text-foreground">
            Eindtijd (optioneel)
          </label>
          <Input
            id="ends_at_time"
            type="time"
            value={endTime}
            onChange={(e) => setEndTime(e.target.value)}
            disabled={!startDatePart}
          />
          <input type="hidden" name="ends_at" value={endsAtIso} />
          <p className="text-xs text-muted">Op dezelfde dag als de start.</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="registration_deadline" className="text-sm font-medium text-foreground">
            Aanmelddeadline (optioneel)
          </label>
          <Input
            id="registration_deadline"
            type="datetime-local"
            value={deadline}
            onChange={(e) => setDeadline(e.target.value)}
          />
          <input type="hidden" name="registration_deadline" value={deadlineIso} />
        </div>
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
