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
  canUploadImage = true,
  showTypePicker = false,
  initialSource,
}: {
  activity?: Activity;
  action: (prevState: ActivityFormState, formData: FormData) => Promise<ActivityFormState>;
  submitLabel: string;
  imageUrl?: string | null;
  canUploadImage?: boolean;
  // Alleen bestuur/beheer mag zelf kiezen tussen een officiële Activiteit
  // (direct gepubliceerd) en Ingebracht (volgt de gewone goedkeuringslogica)
  // — een gewoon lid kan hoe dan ook alleen Ingebracht indienen, dat forceert
  // de normalize_activity_submission-trigger server-side (0024).
  showTypePicker?: boolean;
  // Bij een nieuwe activiteit staat de keuze al vast via een aparte stap
  // vóór dit formulier (NewActivityFlow) — dan geen showTypePicker (niet
  // nogmaals vragen), maar de gekozen waarde moet wel meegestuurd worden.
  initialSource?: "voc" | "lid";
}) {
  const [state, formAction] = useActionState(action, initialState);
  const [preview, setPreview] = useState<string | null>(null);
  const shownImage = preview ?? imageUrl;
  const [source, setSource] = useState<"voc" | "lid">(
    initialSource ?? (activity?.source as "voc" | "lid") ?? (showTypePicker ? "voc" : "lid")
  );
  const [externalRegistration, setExternalRegistration] = useState(Boolean(activity?.external_registration_url));
  const [notifyPush, setNotifyPush] = useState(activity?.notify_push ?? true);
  const [notifyEmail, setNotifyEmail] = useState(activity?.notify_email ?? true);

  const [startsAt, setStartsAt] = useState(toLocalInputValue(activity?.starts_at ?? null));
  const [endTime, setEndTime] = useState(toLocalTimeValue(activity?.ends_at ?? null));
  const [deadline, setDeadline] = useState(toLocalInputValue(activity?.registration_deadline ?? null));

  const startDatePart = startsAt.split("T")[0] ?? "";
  const startsAtIso = startsAt ? new Date(startsAt).toISOString() : "";
  const endsAtIso = startDatePart && endTime ? new Date(`${startDatePart}T${endTime}`).toISOString() : "";
  const deadlineIso = deadline ? new Date(deadline).toISOString() : "";

  return (
    <form action={formAction} className="flex flex-col gap-5">
      <input type="hidden" name="source" value={source} />
      {showTypePicker && (
        <div className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-foreground">Type</span>
          <div className="flex gap-1.5">
            <button
              type="button"
              onClick={() => setSource("voc")}
              className={`rounded-full px-3 py-1.5 text-sm font-medium ${
                source === "voc" ? "bg-voc-red text-white" : "bg-black/[.06] text-muted dark:bg-white/[.08]"
              }`}
            >
              Activiteit
            </button>
            <button
              type="button"
              onClick={() => setSource("lid")}
              className={`rounded-full px-3 py-1.5 text-sm font-medium ${
                source === "lid" ? "bg-voc-red text-white" : "bg-black/[.06] text-muted dark:bg-white/[.08]"
              }`}
            >
              Ingebracht
            </button>
          </div>
          {source === "lid" && (
            <p className="text-xs text-muted">Ingebracht volgt de gewone goedkeuringslogica, net als bij een lid.</p>
          )}
        </div>
      )}

      {source === "voc" && (
        <div className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-foreground">Notificatie bij publiceren</span>
          <p className="text-xs text-muted">
            Respecteert altijd de persoonlijke meldingsvoorkeuren van elk lid — dit bepaalt alleen of het kanaal
            zelf openstaat.
          </p>
          <div className="flex gap-4">
            <label className="flex items-center gap-2 text-sm text-foreground">
              <input
                type="checkbox"
                name="notify_push"
                checked={notifyPush}
                onChange={(e) => setNotifyPush(e.target.checked)}
                className="rounded"
              />
              Push versturen
            </label>
            <label className="flex items-center gap-2 text-sm text-foreground">
              <input
                type="checkbox"
                name="notify_email"
                checked={notifyEmail}
                onChange={(e) => setNotifyEmail(e.target.checked)}
                className="rounded"
              />
              E-mail versturen
            </label>
          </div>
        </div>
      )}

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
            max="2099-12-31T23:59"
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
            max="2099-12-31T23:59"
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

      {source === "lid" && (
        <div className="flex flex-col gap-1.5">
          <label className="flex items-center gap-2 text-sm font-medium text-foreground">
            <input
              type="checkbox"
              name="external_registration"
              checked={externalRegistration}
              onChange={(e) => setExternalRegistration(e.target.checked)}
              className="rounded"
            />
            Aanmelden via externe website
          </label>
          {externalRegistration && (
            <Input
              name="external_registration_url"
              type="url"
              defaultValue={activity?.external_registration_url ?? ""}
              placeholder="https://"
              required
            />
          )}
          {!externalRegistration && (
            <p className="text-xs text-muted">Zonder vinkje gebruikt deze activiteit de gewone VOC-aanmeldfunctie.</p>
          )}
        </div>
      )}

      {canUploadImage && (
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
      )}

      <div className="flex flex-col gap-1.5">
        <label htmlFor="attachments" className="text-sm font-medium text-foreground">
          Bijlagen (optioneel)
        </label>
        <input
          id="attachments"
          name="attachments"
          type="file"
          multiple
          accept="application/pdf,image/png,image/jpeg,.doc,.docx,.ppt,.pptx"
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
