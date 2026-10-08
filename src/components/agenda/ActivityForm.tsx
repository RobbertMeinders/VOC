"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import { useFormStatus } from "react-dom";
import Image from "next/image";
import { ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Switch } from "@/components/ui/Switch";
import { FieldError } from "@/components/ui/FieldError";
import { FormErrorSummary } from "@/components/ui/FormErrorSummary";
import { FileSelectButton } from "@/components/ui/FileSelectButton";
import { compressInputFile } from "@/lib/image/compress";
import { useUnsavedChanges } from "@/lib/ui/UnsavedChangesContext";
import { useToast } from "@/lib/ui/ToastContext";
import { useFieldValidation } from "@/lib/validation/useFieldValidation";
import { validateUrl } from "@/lib/validation/fields";
import { notifyActivityChangeAction, type ActivityFormState } from "@/app/(app)/agenda/actions";
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

// UX-review punt 1/13: na een bewerking die datum/tijd/locatie raakt op een
// activiteit met aanmeldingen, biedt updateActivityAction (offerNotifyChange)
// dit bewerkbare bevestigingsblok aan — expliciete, eenmalige keuze i.p.v.
// automatisch bij elke edit versturen of (het oude gedrag) stilzwijgend
// niets doen.
function NotifyChangePanel({ activityId, suggestedMessage }: { activityId: string; suggestedMessage: string }) {
  const [dismissed, setDismissed] = useState(false);
  const [sent, setSent] = useState(false);
  const [message, setMessage] = useState(suggestedMessage);
  const [isPending, startTransition] = useTransition();

  if (dismissed || sent) {
    return sent ? <p className="text-sm text-muted">Aangemelden zijn geïnformeerd.</p> : null;
  }

  return (
    <div className="flex flex-col gap-2 rounded-lg border border-border bg-background p-3">
      <p className="text-sm font-medium text-foreground">Aangemelden informeren over deze wijziging?</p>
      <textarea
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        rows={2}
        className="rounded-lg border border-input-border bg-surface px-3 py-2 text-sm text-foreground focus:border-voc-red focus:outline-none focus:ring-2 focus:ring-voc-red/20"
      />
      <div className="flex items-center gap-2">
        <Button
          type="button"
          size="sm"
          disabled={isPending}
          onClick={() =>
            startTransition(async () => {
              await notifyActivityChangeAction(activityId, message);
              setSent(true);
            })
          }
        >
          {isPending ? "Versturen…" : "Versturen"}
        </Button>
        <button type="button" onClick={() => setDismissed(true)} className="text-sm text-muted hover:underline">
          Niet nu
        </button>
      </div>
    </div>
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
  const { setDirty } = useUnsavedChanges();
  const toast = useToast();
  // Gereset na een geslaagde submit en bij het verlaten van het formulier
  // (unmount) — zonder dit zou "niet-opgeslagen wijzigingen" blijven hangen
  // voor het volgende overlay dat open gaat.
  useEffect(() => {
    if (state.success) {
      setDirty(false);
      toast("Opgeslagen.");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.success, setDirty]);
  useEffect(() => () => setDirty(false), [setDirty]);
  const [preview, setPreview] = useState<string | null>(null);
  const shownImage = preview ?? imageUrl;
  const [source, setSource] = useState<"voc" | "lid">(
    initialSource ?? (activity?.source as "voc" | "lid") ?? (showTypePicker ? "voc" : "lid")
  );
  const [externalRegistration, setExternalRegistration] = useState(Boolean(activity?.external_registration_url));
  const { errors, validateField, validateAll } = useFieldValidation({
    external_registration_url: (value) => validateUrl(value, externalRegistration),
  });
  const [allowPublicRegistration, setAllowPublicRegistration] = useState(activity?.allow_public_registration ?? false);
  // Standaard uit bij een NIEUWE activiteit — niet elke publicatie hoort
  // per se een pushmelding/mail te verdienen, dus dat is een bewuste keuze
  // i.p.v. een default die je makkelijk over het hoofd ziet. Bij het
  // bewerken van een bestaande activiteit blijft gewoon de opgeslagen
  // waarde staan.
  const [notifyPush, setNotifyPush] = useState(activity?.notify_push ?? false);
  const [notifyEmail, setNotifyEmail] = useState(activity?.notify_email ?? false);

  const [startsAt, setStartsAt] = useState(toLocalInputValue(activity?.starts_at ?? null));
  const [endTime, setEndTime] = useState(toLocalTimeValue(activity?.ends_at ?? null));
  const [deadline, setDeadline] = useState(toLocalInputValue(activity?.registration_deadline ?? null));

  const startDatePart = startsAt.split("T")[0] ?? "";
  const startsAtIso = startsAt ? new Date(startsAt).toISOString() : "";
  const endsAtIso = startDatePart && endTime ? new Date(`${startDatePart}T${endTime}`).toISOString() : "";
  const deadlineIso = deadline ? new Date(deadline).toISOString() : "";

  return (
    // onChange vangt (via bubbling) elke native invoer — tekst/tekstvlak/
    // bestand/checkbox — in één keer op; de niet-native schakelaars (Switch,
    // de type-pillen hieronder) markeren zichzelf expliciet, want een
    // <button onClick> bubbelt niet als een change-event.
    <form
      action={formAction}
      onChange={() => setDirty(true)}
      onSubmit={(e) => {
        if (!validateAll(new FormData(e.currentTarget))) e.preventDefault();
      }}
      className="flex flex-col gap-5"
    >
      <FormErrorSummary errors={errors} />
      <input type="hidden" name="source" value={source} />
      {showTypePicker && (
        <div className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-foreground">Type</span>
          <div className="flex gap-1.5">
            <button
              type="button"
              onClick={() => {
                setSource("voc");
                setDirty(true);
              }}
              className={`rounded-full px-3 py-1.5 text-sm font-medium ${
                source === "voc" ? "bg-voc-red text-white" : "bg-black/[.06] text-muted dark:bg-white/[.08]"
              }`}
            >
              Activiteit
            </button>
            <button
              type="button"
              onClick={() => {
                setSource("lid");
                setDirty(true);
              }}
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
          className="rounded-lg border border-input-border bg-surface px-3 py-2 text-sm text-foreground placeholder:text-muted focus:border-voc-red focus:outline-none focus:ring-2 focus:ring-voc-red/20"
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

      {/* UX-review punt 12: alleen titel/datum/tijd/locatie/omschrijving
          staan los; de rest is minder vaak nodig en staat daarom achter
          "Meer opties" i.p.v. alles plat achter elkaar. Open bij bewerken
          (zodat al ingestelde waarden niet verstopt lijken), dicht bij
          aanmaken. */}
      <details open={Boolean(activity)} className="group rounded-lg border border-border bg-background">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-3 py-2.5 text-sm font-medium text-foreground">
          Meer opties
          <ChevronDown size={16} className="text-muted transition-transform group-open:rotate-180" />
        </summary>
        <div className="flex flex-col gap-5 border-t border-border p-3">
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

          <div className="flex items-center justify-between gap-4 rounded-lg border border-border bg-surface px-3 py-2.5">
            <div>
              <p className="text-sm font-medium text-foreground">Aanmelden door niet-leden toestaan</p>
              <p className="text-xs text-muted">
                Uit: een bezoeker van de openbare website ziet deze activiteit wel, maar kan alleen een lid zich (via
                het portaal) aanmelden.
              </p>
            </div>
            <input type="hidden" name="allow_public_registration" value={allowPublicRegistration ? "on" : ""} />
            <Switch
              checked={allowPublicRegistration}
              onChange={() => {
                setAllowPublicRegistration((v) => !v);
                setDirty(true);
              }}
              label="Aanmelden door niet-leden toestaan"
            />
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
                <>
                  <Input
                    name="external_registration_url"
                    type="text"
                    inputMode="url"
                    defaultValue={activity?.external_registration_url ?? ""}
                    placeholder="https://"
                    invalid={Boolean(errors.external_registration_url)}
                    onBlur={(e) => validateField("external_registration_url", e.target.value)}
                  />
                  <FieldError message={errors.external_registration_url} />
                </>
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
              <FileSelectButton
                id="image"
                name="image"
                accept="image/png,image/jpeg,image/webp"
                onChange={async (e) => {
                  const input = e.target;
                  const compressed = await compressInputFile(input);
                  if (compressed) setPreview(URL.createObjectURL(compressed));
                }}
              />
            </div>
          )}
        </div>
      </details>

      {/* Bijlagen: alleen via ActivityAttachmentUploadForm, apart van dit
          formulier (zie agenda/actions.ts) — op het bewerkscherm stonden
          eerder twee onafhankelijke manieren om een bestand toe te voegen. */}

      {!activity && source === "voc" && (
        // Onderaan i.p.v. bovenaan, en standaard uit: dit stond eerder als
        // eerste bovenaan het formulier met beide vinkjes al aangevinkt,
        // waardoor je zonder er expliciet bij stil te staan meteen een
        // melding naar alle leden stuurde. Nu een bewuste keuze vlak vóór
        // publiceren, in dezelfde schakelaar-stijl als de rest van de app
        // i.p.v. kale checkboxes. Alleen bij AANMAKEN: bij bewerken deed deze
        // switch niets (de onderliggende trigger reageert alleen op het
        // eerste keer goedkeuren), wat een vals "ik heb het gemeld"-gevoel
        // gaf — zie NotifyChangePanel voor wat daarvoor in de plaats kwam.
        <div className="flex flex-col gap-2">
          <span className="text-sm font-medium text-foreground">Notificatie bij publiceren</span>
          <p className="text-xs text-muted">
            Respecteert altijd de persoonlijke meldingsvoorkeuren van elk lid — dit bepaalt alleen of het kanaal
            zelf openstaat.
          </p>
          <div className="flex items-center justify-between gap-4 rounded-lg border border-border bg-background px-3 py-2.5">
            <p className="text-sm text-foreground">Pushmelding versturen</p>
            <input type="hidden" name="notify_push" value={notifyPush ? "on" : ""} />
            <Switch
              checked={notifyPush}
              onChange={() => {
                setNotifyPush((v) => !v);
                setDirty(true);
              }}
              label="Pushmelding versturen"
            />
          </div>
          <div className="flex items-center justify-between gap-4 rounded-lg border border-border bg-background px-3 py-2.5">
            <p className="text-sm text-foreground">E-mail versturen</p>
            <input type="hidden" name="notify_email" value={notifyEmail ? "on" : ""} />
            <Switch
              checked={notifyEmail}
              onChange={() => {
                setNotifyEmail((v) => !v);
                setDirty(true);
              }}
              label="E-mail versturen"
            />
          </div>
        </div>
      )}

      {state.error && (
        <p role="alert" className="rounded-lg bg-voc-red-light px-3 py-2 text-sm text-voc-red-text">
          {state.error}
        </p>
      )}
      <div>
        <SubmitButton label={submitLabel} />
      </div>

      {activity && state.offerNotifyChange && state.suggestedChangeMessage && (
        <NotifyChangePanel activityId={activity.id} suggestedMessage={state.suggestedChangeMessage} />
      )}
    </form>
  );
}
