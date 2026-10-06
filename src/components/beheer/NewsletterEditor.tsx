"use client";

import { useActionState, useEffect, useMemo, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import { useRouter } from "next/navigation";
import Image from "next/image";
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  ArrowDown,
  ArrowUp,
  Bold,
  CalendarClock,
  CalendarDays,
  Image as ImageIcon,
  Italic,
  Laptop,
  Link2,
  Minus,
  RefreshCw,
  Send,
  Smartphone,
  Trash2,
  Type,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Switch } from "@/components/ui/Switch";
import { FileSelectButton } from "@/components/ui/FileSelectButton";
import { compressInputFile } from "@/lib/image/compress";
import {
  updateCommunicationAction,
  uploadNewsletterImageAction,
  getEventSnapshotAction,
  sendTestNewsletterAction,
  sendNewsletterAction,
  scheduleNewsletterAction,
  cancelScheduleAction,
  type CommunicationFormState,
  type UploadImageState,
} from "@/app/(app)/beheer/communicatie/actions";
import { renderNewsletterHtml } from "@/lib/newsletter/render";
import { formatActivityDate } from "@/lib/format/date";
import type { NewsletterAlign, NewsletterBlock } from "@/lib/newsletter/types";
import type { Database } from "@/lib/types/database";

type Communication = Database["public"]["Tables"]["communications"]["Row"];
type ActivityOption = { id: string; title: string; starts_at: string };

const initialState: CommunicationFormState = {};
const uploadInitialState: UploadImageState = {};

function newBlockId(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : Math.random().toString(36).slice(2);
}

function textAreaClass() {
  return "w-full rounded-lg border border-border bg-surface px-3.5 py-3 text-base text-foreground placeholder:text-muted focus:border-voc-red focus:outline-none focus:ring-2 focus:ring-voc-red/20";
}

function inputSizeClass() {
  return "h-11 text-base";
}

// Bewust geen contentEditable/rich-text-editor — wrapt de geselecteerde
// tekst in **/* (gelezen door formatInlineText in render.ts) zodat de
// opgeslagen inhoud gewoon leesbare platte tekst blijft, veilig genoeg om
// zonder verdere validatie in e-mailveilige HTML te zetten.
function RichTextarea({
  value,
  onChange,
  rows,
  placeholder,
}: {
  value: string;
  onChange: (value: string) => void;
  rows: number;
  placeholder?: string;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);

  function wrapSelection(marker: string) {
    const el = ref.current;
    if (!el) return;
    const start = el.selectionStart;
    const end = el.selectionEnd;
    if (start === end) return;
    const next = value.slice(0, start) + marker + value.slice(start, end) + marker + value.slice(end);
    onChange(next);
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(start + marker.length, end + marker.length);
    });
  }

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center gap-1">
        <button
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => wrapSelection("**")}
          title="Selecteer tekst en klik hierop om 'm vet te maken"
          aria-label="Vet"
          className="flex h-8 w-8 items-center justify-center rounded-lg text-muted hover:bg-black/[.06] hover:text-foreground dark:hover:bg-white/[.08]"
        >
          <Bold size={15} />
        </button>
        <button
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => wrapSelection("*")}
          title="Selecteer tekst en klik hierop om 'm cursief te maken"
          aria-label="Cursief"
          className="flex h-8 w-8 items-center justify-center rounded-lg text-muted hover:bg-black/[.06] hover:text-foreground dark:hover:bg-white/[.08]"
        >
          <Italic size={15} />
        </button>
        <span className="text-xs text-muted">Selecteer een woord of zin, klik dan op B of I</span>
      </div>
      <textarea
        ref={ref}
        rows={rows}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={textAreaClass()}
      />
    </div>
  );
}

function AlignButtons({ value, onChange }: { value: NewsletterAlign | undefined; onChange: (align: NewsletterAlign) => void }) {
  const options: { key: NewsletterAlign; Icon: typeof AlignLeft; label: string }[] = [
    { key: "left", Icon: AlignLeft, label: "Links uitlijnen" },
    { key: "center", Icon: AlignCenter, label: "Centreren" },
    { key: "right", Icon: AlignRight, label: "Rechts uitlijnen" },
  ];
  const active = value ?? "left";
  return (
    <div className="flex items-center gap-1.5">
      {options.map(({ key, Icon, label }) => (
        <button
          key={key}
          type="button"
          onClick={() => onChange(key)}
          title={label}
          aria-label={label}
          className={`flex h-9 w-9 items-center justify-center rounded-full ${
            active === key ? "bg-voc-red text-white" : "bg-black/[.06] text-muted dark:bg-white/[.08]"
          }`}
        >
          <Icon size={16} />
        </button>
      ))}
    </div>
  );
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Opslaan…" : "Opslaan"}
    </Button>
  );
}

function BlockImageUpload({ onUploaded }: { onUploaded: (url: string) => void }) {
  const [state, formAction] = useActionState(uploadNewsletterImageAction, uploadInitialState);
  const formRef = useRef<HTMLFormElement>(null);
  const appliedUrlRef = useRef<string | undefined>(undefined);

  useEffect(() => {
    if (state.url && state.url !== appliedUrlRef.current) {
      appliedUrlRef.current = state.url;
      onUploaded(state.url);
      formRef.current?.reset();
    }
  }, [state.url, onUploaded]);

  return (
    <form ref={formRef} action={formAction} className="flex flex-wrap items-center gap-2">
      <FileSelectButton
        name="image"
        accept="image/png,image/jpeg,image/webp"
        required
        label="Afbeelding kiezen"
        onChange={async (e) => {
          await compressInputFile(e.target);
        }}
      />
      <UploadButtonSmall />
      {state.error && <span className="text-sm text-voc-red">{state.error}</span>}
    </form>
  );
}

function UploadButtonSmall() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant="secondary" disabled={pending}>
      {pending ? "Uploaden…" : "Uploaden"}
    </Button>
  );
}

function BlockShell({
  label,
  onMoveUp,
  onMoveDown,
  onRemove,
  canMoveUp,
  canMoveDown,
  readOnly,
  children,
}: {
  label: string;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onRemove: () => void;
  canMoveUp: boolean;
  canMoveDown: boolean;
  readOnly: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-border bg-surface p-5 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <span className="text-sm font-semibold uppercase tracking-wide text-muted">{label}</span>
        {!readOnly && (
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={onMoveUp}
              disabled={!canMoveUp}
              title="Omhoog"
              aria-label="Omhoog"
              className="flex h-9 w-9 items-center justify-center rounded-full text-muted hover:bg-black/[.04] hover:text-foreground disabled:opacity-30 dark:hover:bg-white/[.08]"
            >
              <ArrowUp size={18} />
            </button>
            <button
              type="button"
              onClick={onMoveDown}
              disabled={!canMoveDown}
              title="Omlaag"
              aria-label="Omlaag"
              className="flex h-9 w-9 items-center justify-center rounded-full text-muted hover:bg-black/[.04] hover:text-foreground disabled:opacity-30 dark:hover:bg-white/[.08]"
            >
              <ArrowDown size={18} />
            </button>
            <button
              type="button"
              onClick={onRemove}
              title="Verwijderen"
              aria-label="Verwijderen"
              className="flex h-9 w-9 items-center justify-center rounded-full text-muted hover:bg-black/[.04] hover:text-voc-red dark:hover:bg-white/[.08]"
            >
              <Trash2 size={18} />
            </button>
          </div>
        )}
      </div>
      {/* Een fieldset schakelt elk invoerveld/knop binnen een blok in één
          keer uit voor een verzonden (dus onveranderlijke) campagne — veiliger
          dan elk veld apart een disabled-prop meegeven, en dekt ook
          BlockImageUpload's eigen, losse formulier mee (fieldset-disabled
          werkt op DOM-nesting, niet op form-lidmaatschap). */}
      <fieldset disabled={readOnly} className="contents">
        {children}
      </fieldset>
    </div>
  );
}

function EventBlockEditor({
  block,
  onChange,
  activities,
}: {
  block: Extract<NewsletterBlock, { type: "event" }>;
  onChange: (block: NewsletterBlock) => void;
  activities: ActivityOption[];
}) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function applySnapshot(activityId: string) {
    setPending(true);
    setError(null);
    const result = await getEventSnapshotAction(activityId, block.id, block.buttonLabel);
    setPending(false);
    if (result.error || !result.block) {
      setError(result.error ?? "Er ging iets mis bij het laden van de activiteit.");
      return;
    }
    onChange(result.block);
  }

  if (!block.activityId) {
    return (
      <div className="flex flex-col gap-2">
        <select
          defaultValue=""
          disabled={pending}
          onChange={(e) => {
            if (e.target.value) applySnapshot(e.target.value);
          }}
          className="h-11 w-full rounded-lg border border-border bg-surface px-3.5 text-base text-foreground focus:border-voc-red focus:outline-none focus:ring-2 focus:ring-voc-red/20"
        >
          <option value="" disabled>
            {pending ? "Laden…" : "Kies een activiteit…"}
          </option>
          {activities.map((activity) => (
            <option key={activity.id} value={activity.id}>
              {activity.title} — {formatActivityDate(activity.starts_at)}
            </option>
          ))}
        </select>
        {error && <p className="text-sm text-voc-red">{error}</p>}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex gap-3">
        {block.imageUrl && (
          <Image
            src={block.imageUrl}
            alt=""
            width={96}
            height={96}
            className="h-24 w-24 shrink-0 rounded-lg object-cover"
            unoptimized
          />
        )}
        <p className="self-center text-sm text-muted">{formatActivityDate(block.startsAtIso)}</p>
      </div>

      <Input
        placeholder="Titel"
        value={block.title}
        onChange={(e) => onChange({ ...block, title: e.target.value })}
        className={inputSizeClass()}
      />
      <Input
        placeholder="Locatie (optioneel)"
        value={block.location ?? ""}
        onChange={(e) => onChange({ ...block, location: e.target.value || null })}
        className={inputSizeClass()}
      />
      <RichTextarea
        rows={4}
        placeholder="Omschrijving"
        value={block.description ?? ""}
        onChange={(value) => onChange({ ...block, description: value || null })}
      />
      <Input
        placeholder="Knoptekst, bv. “Bekijk evenement”"
        value={block.buttonLabel}
        onChange={(e) => onChange({ ...block, buttonLabel: e.target.value })}
        className={inputSizeClass()}
      />

      {error && <p className="text-sm text-voc-red">{error}</p>}
      <div className="flex flex-col gap-1.5">
        <div className="flex flex-wrap items-center gap-3">
          <Button type="button" variant="secondary" onClick={() => applySnapshot(block.activityId)} disabled={pending}>
            <RefreshCw size={16} />
            {pending ? "Verversen…" : "Ververs"}
          </Button>
          <button
            type="button"
            onClick={() =>
              onChange({
                ...block,
                activityId: "",
                title: "",
                startsAtIso: "",
                endsAtIso: null,
                location: null,
                description: null,
                imageUrl: null,
                linkUrl: "",
              })
            }
            className="text-sm font-medium text-muted hover:text-foreground"
          >
            Andere activiteit kiezen
          </button>
        </div>
        <p className="text-xs text-muted">
          Ververs haalt titel, locatie, omschrijving en afbeelding opnieuw op uit de activiteit — eigen wijzigingen
          daaraan gaan dan verloren. De knoptekst blijft altijd staan.
        </p>
      </div>
    </div>
  );
}

function BlockEditor({
  block,
  onChange,
  onMoveUp,
  onMoveDown,
  onRemove,
  canMoveUp,
  canMoveDown,
  activities,
  readOnly,
}: {
  block: NewsletterBlock;
  onChange: (block: NewsletterBlock) => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onRemove: () => void;
  canMoveUp: boolean;
  canMoveDown: boolean;
  activities: ActivityOption[];
  readOnly: boolean;
}) {
  const shellProps = { onMoveUp, onMoveDown, onRemove, canMoveUp, canMoveDown, readOnly };

  if (block.type === "text") {
    return (
      <BlockShell label="Tekst" {...shellProps}>
        <div className="flex flex-col gap-3">
          <Input
            placeholder="Titel (optioneel)"
            value={block.title ?? ""}
            onChange={(e) => onChange({ ...block, title: e.target.value })}
            className={inputSizeClass()}
          />
          <RichTextarea
            rows={5}
            placeholder="Tekst"
            value={block.body}
            onChange={(value) => onChange({ ...block, body: value })}
          />
          <AlignButtons value={block.align} onChange={(align) => onChange({ ...block, align })} />
        </div>
      </BlockShell>
    );
  }

  if (block.type === "image") {
    return (
      <BlockShell label="Afbeelding" {...shellProps}>
        <div className="flex flex-col gap-3">
          {block.url && (
            <Image
              src={block.url}
              alt=""
              width={240}
              height={150}
              className="h-[150px] w-[240px] rounded-lg object-cover"
              unoptimized
            />
          )}
          <BlockImageUpload onUploaded={(url) => onChange({ ...block, url })} />
          <div className="flex flex-wrap gap-2">
            {(["full", "left", "right"] as const).map((layout) => (
              <button
                key={layout}
                type="button"
                onClick={() => onChange({ ...block, layout })}
                className={`rounded-full px-4 py-2 text-sm font-medium ${
                  block.layout === layout ? "bg-voc-red text-white" : "bg-black/[.06] text-muted dark:bg-white/[.08]"
                }`}
              >
                {layout === "full" ? "Volledige breedte" : layout === "left" ? "Foto links" : "Foto rechts"}
              </button>
            ))}
          </div>
          {block.layout !== "full" && (
            <>
              <Input
                placeholder="Titel bij de foto (optioneel)"
                value={block.title ?? ""}
                onChange={(e) => onChange({ ...block, title: e.target.value })}
                className={inputSizeClass()}
              />
              <RichTextarea
                rows={3}
                placeholder="Tekst bij de foto (optioneel)"
                value={block.body ?? ""}
                onChange={(value) => onChange({ ...block, body: value })}
              />
              <div className="flex flex-col gap-1.5">
                <label className="text-sm text-muted">Breedte afbeelding: {block.imageWidthPercent ?? 33}%</label>
                <input
                  type="range"
                  min={20}
                  max={80}
                  step={5}
                  value={block.imageWidthPercent ?? 33}
                  onChange={(e) => onChange({ ...block, imageWidthPercent: Number(e.target.value) })}
                  className="w-full accent-voc-red"
                />
              </div>
            </>
          )}
        </div>
      </BlockShell>
    );
  }

  if (block.type === "button") {
    return (
      <BlockShell label="Knop" {...shellProps}>
        <div className="flex flex-col gap-3">
          <Input
            placeholder="Knoptekst, bv. “Bekijk evenement”"
            value={block.label}
            onChange={(e) => onChange({ ...block, label: e.target.value })}
            className={inputSizeClass()}
          />
          <Input
            placeholder="Link (https://...)"
            value={block.url}
            onChange={(e) => onChange({ ...block, url: e.target.value })}
            className={inputSizeClass()}
          />
          <AlignButtons value={block.align} onChange={(align) => onChange({ ...block, align })} />
        </div>
      </BlockShell>
    );
  }

  if (block.type === "event") {
    return (
      <BlockShell label="Evenement" {...shellProps}>
        <EventBlockEditor block={block} onChange={onChange} activities={activities} />
      </BlockShell>
    );
  }

  return (
    <BlockShell label="Scheidingslijn" {...shellProps}>
      <p className="text-sm text-muted">Een nette, dunne lijn tussen twee blokken — geen verdere instellingen.</p>
    </BlockShell>
  );
}

function PreviewToggleButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${
        active ? "bg-voc-red text-white" : "bg-black/[.06] text-muted dark:bg-white/[.08]"
      }`}
    >
      {children}
    </button>
  );
}

export function NewsletterEditor({
  communication,
  activities,
  activeMemberCount,
  sentCount,
  orgName,
  logoUrl,
}: {
  communication: Communication;
  activities: ActivityOption[];
  activeMemberCount: number;
  sentCount: number;
  orgName: string;
  logoUrl: string | null;
}) {
  const router = useRouter();
  const formId = `newsletter-editor-${communication.id}`;
  const updateWithId = updateCommunicationAction.bind(null, communication.id);
  const [state, formAction] = useActionState(updateWithId, initialState);
  const [subject, setSubject] = useState(communication.subject);
  const [preheader, setPreheader] = useState(communication.preheader ?? "");
  const [senderName, setSenderName] = useState(communication.sender_name ?? "");
  const [showHeader, setShowHeader] = useState(communication.show_header);
  const [showFooter, setShowFooter] = useState(communication.show_footer);
  const [blocks, setBlocks] = useState<NewsletterBlock[]>(
    Array.isArray(communication.content) ? (communication.content as unknown as NewsletterBlock[]) : []
  );
  const [previewDevice, setPreviewDevice] = useState<"desktop" | "mobile">("desktop");
  const [testSendPending, setTestSendPending] = useState(false);
  const [testSendResult, setTestSendResult] = useState<{ error?: string; success?: boolean } | null>(null);

  async function handleTestSend() {
    setTestSendPending(true);
    setTestSendResult(null);
    const result = await sendTestNewsletterAction(subject, preheader, senderName, blocks, showHeader, showFooter);
    setTestSendPending(false);
    setTestSendResult(result);
  }

  const [sendPending, setSendPending] = useState(false);
  const [sendResult, setSendResult] = useState<{ error?: string; total?: number; sent?: number } | null>(null);

  async function handleSend() {
    const isRetry = communication.status === "verzenden_mislukt";
    const confirmMessage = isRetry
      ? `Opnieuw proberen te versturen aan de ${activeMemberCount - sentCount} leden die 'm nog niet ontvingen. Dit kan niet ongedaan worden gemaakt. Doorgaan?`
      : `Dit verstuurt "${communication.subject}" naar ${activeMemberCount} actieve leden. Dit kan niet ongedaan worden gemaakt. Doorgaan?`;
    if (!window.confirm(confirmMessage)) return;

    setSendPending(true);
    setSendResult(null);
    const result = await sendNewsletterAction(communication.id);
    setSendPending(false);
    setSendResult(result);
    router.refresh();
  }

  const [scheduledAtInput, setScheduledAtInput] = useState("");
  const [schedulePending, setSchedulePending] = useState(false);
  const [scheduleError, setScheduleError] = useState<string | null>(null);

  async function handleSchedule() {
    if (!scheduledAtInput) return;
    const iso = new Date(scheduledAtInput).toISOString();
    if (!window.confirm(`Campagne inplannen voor ${new Date(iso).toLocaleString("nl-NL")}? Dit kan niet ongedaan worden gemaakt.`)) {
      return;
    }
    setSchedulePending(true);
    setScheduleError(null);
    const result = await scheduleNewsletterAction(communication.id, iso);
    setSchedulePending(false);
    if (result.error) {
      setScheduleError(result.error);
      return;
    }
    router.refresh();
  }

  async function handleCancelSchedule() {
    if (!window.confirm("Planning annuleren? De campagne wordt weer een concept.")) return;
    setSchedulePending(true);
    setScheduleError(null);
    const result = await cancelScheduleAction(communication.id);
    setSchedulePending(false);
    if (result.error) {
      setScheduleError(result.error);
      return;
    }
    router.refresh();
  }

  const previewHtml = useMemo(
    () => renderNewsletterHtml(blocks, { subject, preheader, showHeader, showFooter, orgName, logoUrl }),
    [blocks, subject, preheader, showHeader, showFooter, orgName, logoUrl]
  );

  function addBlock(type: NewsletterBlock["type"]) {
    const base = { id: newBlockId() };
    const block: NewsletterBlock =
      type === "text"
        ? { ...base, type: "text", body: "" }
        : type === "image"
          ? { ...base, type: "image", url: "", layout: "full" }
          : type === "button"
            ? { ...base, type: "button", label: "", url: "" }
            : type === "event"
              ? {
                  ...base,
                  type: "event",
                  activityId: "",
                  title: "",
                  startsAtIso: "",
                  endsAtIso: null,
                  location: null,
                  description: null,
                  imageUrl: null,
                  linkUrl: "",
                  buttonLabel: "Bekijk evenement",
                }
              : { ...base, type: "divider" };
    setBlocks((prev) => [...prev, block]);
  }

  function updateBlock(index: number, next: NewsletterBlock) {
    setBlocks((prev) => prev.map((b, i) => (i === index ? next : b)));
  }

  function removeBlock(index: number) {
    setBlocks((prev) => prev.filter((_, i) => i !== index));
  }

  function moveBlock(index: number, direction: -1 | 1) {
    setBlocks((prev) => {
      const next = [...prev];
      const target = index + direction;
      if (target < 0 || target >= next.length) return prev;
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }

  // Vanaf het eerste verzendmoment ligt de inhoud vast — ook bij een
  // gedeeltelijk mislukte verzending ('verzenden_mislukt'). Zonder deze
  // slotgrendel zou "Opnieuw proberen" de al-verstuurde ontvangers een
  // andere versie laten lezen dan wie de retry nog moet bereiken.
  const readOnly = communication.status !== "concept";

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div className="flex flex-col gap-6">
        <div className="rounded-2xl border border-border bg-surface p-5 shadow-sm">
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="subject-input" className="text-sm font-medium text-foreground">
                Onderwerp
              </label>
              <Input
                id="subject-input"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                required
                disabled={readOnly}
                placeholder="De hoofdregel die leden in hun inbox zien"
                className="h-11 text-base"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="preheader-input" className="text-sm font-medium text-foreground">
                Pre-header <span className="font-normal text-muted">(optioneel)</span>
              </label>
              <Input
                id="preheader-input"
                value={preheader}
                onChange={(e) => setPreheader(e.target.value)}
                disabled={readOnly}
                placeholder="Korte aanvullende tekst, zichtbaar naast het onderwerp in de inbox"
                className="h-11 text-base"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="sender_name" className="text-sm font-medium text-foreground">
                Afzendernaam <span className="font-normal text-muted">(optioneel)</span>
              </label>
              <Input
                id="sender_name"
                name="sender_name"
                form={formId}
                value={senderName}
                onChange={(e) => setSenderName(e.target.value)}
                disabled={readOnly}
                placeholder="Veendammer Ondernemer Compagnie"
                className="h-11 text-base"
              />
            </div>
            <div className="flex flex-col gap-2.5 border-t border-border pt-3">
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm font-medium text-foreground">VOC-logo bovenaan</span>
                <Switch checked={showHeader} onChange={() => setShowHeader((v) => !v)} disabled={readOnly} label="VOC-logo bovenaan tonen" />
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm font-medium text-foreground">Voettekst met social-links</span>
                <Switch checked={showFooter} onChange={() => setShowFooter((v) => !v)} disabled={readOnly} label="Voettekst met social-links tonen" />
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-4">
          {blocks.map((block, index) => (
            <BlockEditor
              key={block.id}
              block={block}
              onChange={(next) => updateBlock(index, next)}
              onMoveUp={() => moveBlock(index, -1)}
              onMoveDown={() => moveBlock(index, 1)}
              onRemove={() => removeBlock(index)}
              canMoveUp={index > 0}
              canMoveDown={index < blocks.length - 1}
              activities={activities}
              readOnly={readOnly}
            />
          ))}
        </div>

        {!readOnly && (
          <div className="flex flex-wrap gap-2.5">
            <button
              type="button"
              onClick={() => addBlock("text")}
              className="flex items-center gap-2 rounded-full border border-border bg-surface px-4 py-2.5 text-sm font-medium text-foreground hover:bg-black/[.03] dark:hover:bg-white/[.06]"
            >
              <Type size={18} />
              Tekst
            </button>
            <button
              type="button"
              onClick={() => addBlock("image")}
              className="flex items-center gap-2 rounded-full border border-border bg-surface px-4 py-2.5 text-sm font-medium text-foreground hover:bg-black/[.03] dark:hover:bg-white/[.06]"
            >
              <ImageIcon size={18} />
              Afbeelding
            </button>
            <button
              type="button"
              onClick={() => addBlock("button")}
              className="flex items-center gap-2 rounded-full border border-border bg-surface px-4 py-2.5 text-sm font-medium text-foreground hover:bg-black/[.03] dark:hover:bg-white/[.06]"
            >
              <Link2 size={18} />
              Knop
            </button>
            <button
              type="button"
              onClick={() => addBlock("event")}
              className="flex items-center gap-2 rounded-full border border-border bg-surface px-4 py-2.5 text-sm font-medium text-foreground hover:bg-black/[.03] dark:hover:bg-white/[.06]"
            >
              <CalendarDays size={18} />
              Evenement
            </button>
            <button
              type="button"
              onClick={() => addBlock("divider")}
              className="flex items-center gap-2 rounded-full border border-border bg-surface px-4 py-2.5 text-sm font-medium text-foreground hover:bg-black/[.03] dark:hover:bg-white/[.06]"
            >
              <Minus size={18} />
              Scheidingslijn
            </button>
          </div>
        )}

        {/* Los van de blokkeneditor hierboven: elk blok heeft eventueel een
            eigen afbeelding-uploadformulier, en formulieren mogen niet in
            elkaar genest zijn. Onderwerp/pre-header/afzender/inhoud koppelen
            daarom via het HTML5 form="..."-attribuut aan dit formulier. */}
        <form id={formId} action={formAction} className="flex flex-col gap-4">
          <input type="hidden" name="content" value={JSON.stringify(blocks)} />
          <input type="hidden" name="subject" value={subject} />
          <input type="hidden" name="preheader" value={preheader} />
          <input type="hidden" name="show_header" value={showHeader ? "true" : "false"} />
          <input type="hidden" name="show_footer" value={showFooter ? "true" : "false"} />

          {state.error && (
            <p role="alert" className="rounded-lg bg-voc-red-light px-3 py-2 text-sm text-voc-red">
              {state.error}
            </p>
          )}
          {state.success && <p className="text-sm text-green-600">Opgeslagen.</p>}

          {!readOnly && (
            <div>
              <SubmitButton />
            </div>
          )}
        </form>

        {communication.status === "ingepland" && (
          <div className="rounded-2xl border border-border bg-surface p-5 shadow-sm">
            <p className="text-sm font-medium text-foreground">Ingepland</p>
            <p className="mt-1 text-sm text-muted">
              Wordt verstuurd aan alle {activeMemberCount} actieve leden op{" "}
              {communication.scheduled_at ? new Date(communication.scheduled_at).toLocaleString("nl-NL") : "—"}.
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <Button type="button" variant="secondary" onClick={handleCancelSchedule} disabled={schedulePending}>
                <X size={16} />
                {schedulePending ? "Bezig…" : "Annuleer planning"}
              </Button>
              {scheduleError && <p className="text-sm text-voc-red">{scheduleError}</p>}
            </div>
          </div>
        )}

        {(communication.status === "concept" || communication.status === "verzenden_mislukt") && (
          <div className="rounded-2xl border border-border bg-surface p-5 shadow-sm">
            <p className="text-sm font-medium text-foreground">Versturen</p>
            <p className="mt-1 text-sm text-muted">
              {communication.status === "verzenden_mislukt"
                ? `${sentCount} van ${activeMemberCount} actieve leden ontvingen 'm al — de rest nog niet.`
                : `Gaat naar alle ${activeMemberCount} actieve leden.`}
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <Button type="button" onClick={handleSend} disabled={sendPending}>
                <Send size={16} />
                {sendPending ? "Versturen…" : communication.status === "verzenden_mislukt" ? "Opnieuw proberen" : "Versturen"}
              </Button>
              {sendResult?.error && <p className="text-sm text-voc-red">{sendResult.error}</p>}
              {sendResult && sendResult.total !== undefined && sendResult.sent !== undefined && (
                <p className={`text-sm ${sendResult.sent >= sendResult.total ? "text-green-600" : "text-voc-red"}`}>
                  {sendResult.sent} van {sendResult.total} verzonden
                  {sendResult.sent < sendResult.total && " — probeer het later opnieuw voor de rest."}
                </p>
              )}
            </div>

            {communication.status === "concept" && (
              <div className="mt-4 flex flex-wrap items-end gap-3 border-t border-border pt-4">
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="scheduled-at-input" className="text-sm text-muted">
                    Of plan in voor later
                  </label>
                  <input
                    id="scheduled-at-input"
                    type="datetime-local"
                    value={scheduledAtInput}
                    onChange={(e) => setScheduledAtInput(e.target.value)}
                    className="h-11 rounded-lg border border-border bg-surface px-3 text-sm text-foreground focus:border-voc-red focus:outline-none focus:ring-2 focus:ring-voc-red/20"
                  />
                </div>
                <Button type="button" variant="secondary" onClick={handleSchedule} disabled={schedulePending || !scheduledAtInput}>
                  <CalendarClock size={16} />
                  {schedulePending ? "Bezig…" : "Inplannen"}
                </Button>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="lg:sticky lg:top-4 lg:self-start">
        <div className="flex flex-col gap-2 rounded-2xl border border-border bg-surface p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-foreground">Voorbeeld</p>
            <div className="flex gap-1.5">
              <PreviewToggleButton active={previewDevice === "desktop"} onClick={() => setPreviewDevice("desktop")}>
                <Laptop size={13} />
                Desktop
              </PreviewToggleButton>
              <PreviewToggleButton active={previewDevice === "mobile"} onClick={() => setPreviewDevice("mobile")}>
                <Smartphone size={13} />
                Mobiel
              </PreviewToggleButton>
            </div>
          </div>
          <div className="flex justify-center rounded-xl bg-black/[.03] p-3 dark:bg-white/[.04]">
            <iframe
              title="Voorbeeld campagne"
              srcDoc={previewHtml}
              sandbox=""
              className={`h-[min(78vh,900px)] rounded-lg border border-border bg-white transition-[width] ${
                previewDevice === "desktop" ? "w-full" : "w-[390px]"
              }`}
            />
          </div>
          <div className="flex flex-wrap items-center gap-3 border-t border-border pt-3">
            <Button type="button" variant="secondary" onClick={handleTestSend} disabled={testSendPending}>
              <Send size={16} />
              {testSendPending ? "Versturen…" : "Testmail versturen naar mij"}
            </Button>
            {testSendResult?.success && <p className="text-sm text-green-600">Testmail verstuurd.</p>}
            {testSendResult?.error && <p className="text-sm text-voc-red">{testSendResult.error}</p>}
          </div>
        </div>
      </div>
    </div>
  );
}
