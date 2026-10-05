"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import Image from "next/image";
import { ArrowDown, ArrowUp, Image as ImageIcon, Link2, Minus, Trash2, Type } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { compressInputFile } from "@/lib/image/compress";
import {
  updateCommunicationAction,
  uploadNewsletterImageAction,
  type CommunicationFormState,
  type UploadImageState,
} from "@/app/(app)/beheer/communicatie/actions";
import type { NewsletterBlock } from "@/lib/newsletter/types";
import type { Database } from "@/lib/types/database";

type Communication = Database["public"]["Tables"]["communications"]["Row"];

const initialState: CommunicationFormState = {};
const uploadInitialState: UploadImageState = {};

function newBlockId(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : Math.random().toString(36).slice(2);
}

function textAreaClass() {
  return "w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground placeholder:text-muted focus:border-voc-red focus:outline-none focus:ring-2 focus:ring-voc-red/20";
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
      <input
        type="file"
        name="image"
        accept="image/png,image/jpeg,image/webp"
        required
        onChange={async (e) => {
          await compressInputFile(e.target);
        }}
        className="text-xs text-foreground file:mr-2 file:cursor-pointer file:rounded-full file:border-0 file:bg-voc-red-light file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-voc-red hover:file:bg-voc-red/20"
      />
      <UploadButtonSmall />
      {state.error && <span className="text-xs text-voc-red">{state.error}</span>}
    </form>
  );
}

function UploadButtonSmall() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="sm" variant="secondary" disabled={pending}>
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
  children,
}: {
  label: string;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onRemove: () => void;
  canMoveUp: boolean;
  canMoveDown: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-border bg-surface p-3 shadow-sm">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wide text-muted">{label}</span>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={onMoveUp}
            disabled={!canMoveUp}
            title="Omhoog"
            aria-label="Omhoog"
            className="flex h-7 w-7 items-center justify-center rounded-full text-muted hover:bg-black/[.04] hover:text-foreground disabled:opacity-30 dark:hover:bg-white/[.08]"
          >
            <ArrowUp size={14} />
          </button>
          <button
            type="button"
            onClick={onMoveDown}
            disabled={!canMoveDown}
            title="Omlaag"
            aria-label="Omlaag"
            className="flex h-7 w-7 items-center justify-center rounded-full text-muted hover:bg-black/[.04] hover:text-foreground disabled:opacity-30 dark:hover:bg-white/[.08]"
          >
            <ArrowDown size={14} />
          </button>
          <button
            type="button"
            onClick={onRemove}
            title="Verwijderen"
            aria-label="Verwijderen"
            className="flex h-7 w-7 items-center justify-center rounded-full text-muted hover:bg-black/[.04] hover:text-voc-red dark:hover:bg-white/[.08]"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>
      {children}
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
}: {
  block: NewsletterBlock;
  onChange: (block: NewsletterBlock) => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onRemove: () => void;
  canMoveUp: boolean;
  canMoveDown: boolean;
}) {
  const shellProps = { onMoveUp, onMoveDown, onRemove, canMoveUp, canMoveDown };

  if (block.type === "text") {
    return (
      <BlockShell label="Tekst" {...shellProps}>
        <div className="flex flex-col gap-2">
          <Input
            placeholder="Titel (optioneel)"
            value={block.title ?? ""}
            onChange={(e) => onChange({ ...block, title: e.target.value })}
          />
          <Input
            placeholder="Subtitel (optioneel)"
            value={block.subtitle ?? ""}
            onChange={(e) => onChange({ ...block, subtitle: e.target.value })}
          />
          <textarea
            rows={4}
            placeholder="Tekst"
            value={block.body}
            onChange={(e) => onChange({ ...block, body: e.target.value })}
            className={textAreaClass()}
          />
        </div>
      </BlockShell>
    );
  }

  if (block.type === "image") {
    return (
      <BlockShell label="Afbeelding" {...shellProps}>
        <div className="flex flex-col gap-2">
          {block.url && (
            <Image src={block.url} alt="" width={160} height={100} className="h-[100px] w-[160px] rounded-lg object-cover" unoptimized />
          )}
          <BlockImageUpload onUploaded={(url) => onChange({ ...block, url })} />
          <div className="flex gap-1.5">
            {(["full", "left", "right"] as const).map((layout) => (
              <button
                key={layout}
                type="button"
                onClick={() => onChange({ ...block, layout })}
                className={`rounded-full px-3 py-1 text-xs font-medium ${
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
              />
              <textarea
                rows={3}
                placeholder="Tekst bij de foto (optioneel)"
                value={block.body ?? ""}
                onChange={(e) => onChange({ ...block, body: e.target.value })}
                className={textAreaClass()}
              />
            </>
          )}
        </div>
      </BlockShell>
    );
  }

  if (block.type === "button") {
    return (
      <BlockShell label="Knop" {...shellProps}>
        <div className="flex flex-col gap-2">
          <Input
            placeholder="Knoptekst, bv. “Bekijk evenement”"
            value={block.label}
            onChange={(e) => onChange({ ...block, label: e.target.value })}
          />
          <Input
            placeholder="Link (https://...)"
            value={block.url}
            onChange={(e) => onChange({ ...block, url: e.target.value })}
          />
        </div>
      </BlockShell>
    );
  }

  return (
    <BlockShell label="Scheidingslijn" {...shellProps}>
      <p className="text-xs text-muted">Een nette, dunne lijn tussen twee blokken — geen verdere instellingen.</p>
    </BlockShell>
  );
}

export function NewsletterEditor({ communication }: { communication: Communication }) {
  const updateWithId = updateCommunicationAction.bind(null, communication.id);
  const [state, formAction] = useActionState(updateWithId, initialState);
  const [blocks, setBlocks] = useState<NewsletterBlock[]>(
    Array.isArray(communication.content) ? (communication.content as unknown as NewsletterBlock[]) : []
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

  const readOnly = communication.status === "verzonden";

  return (
    <form action={formAction} className="flex flex-col gap-5">
      <input type="hidden" name="content" value={JSON.stringify(blocks)} />

      <div className="rounded-2xl border border-border bg-surface p-4 shadow-sm">
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="subject" className="text-sm font-medium text-foreground">
              Onderwerp
            </label>
            <Input
              id="subject"
              name="subject"
              defaultValue={communication.subject}
              required
              disabled={readOnly}
              placeholder="De hoofdregel die leden in hun inbox zien"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="preheader" className="text-sm font-medium text-foreground">
              Pre-header <span className="font-normal text-muted">(optioneel)</span>
            </label>
            <Input
              id="preheader"
              name="preheader"
              defaultValue={communication.preheader ?? ""}
              disabled={readOnly}
              placeholder="Korte aanvullende tekst, zichtbaar naast het onderwerp in de inbox"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="sender_name" className="text-sm font-medium text-foreground">
              Afzendernaam <span className="font-normal text-muted">(optioneel)</span>
            </label>
            <Input
              id="sender_name"
              name="sender_name"
              defaultValue={communication.sender_name ?? ""}
              disabled={readOnly}
              placeholder="Veendammer Ondernemer Compagnie"
            />
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-3">
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
          />
        ))}
      </div>

      {!readOnly && (
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => addBlock("text")}
            className="flex items-center gap-1.5 rounded-full border border-border bg-surface px-3 py-1.5 text-sm font-medium text-foreground hover:bg-black/[.03] dark:hover:bg-white/[.06]"
          >
            <Type size={16} />
            Tekst
          </button>
          <button
            type="button"
            onClick={() => addBlock("image")}
            className="flex items-center gap-1.5 rounded-full border border-border bg-surface px-3 py-1.5 text-sm font-medium text-foreground hover:bg-black/[.03] dark:hover:bg-white/[.06]"
          >
            <ImageIcon size={16} />
            Afbeelding
          </button>
          <button
            type="button"
            onClick={() => addBlock("button")}
            className="flex items-center gap-1.5 rounded-full border border-border bg-surface px-3 py-1.5 text-sm font-medium text-foreground hover:bg-black/[.03] dark:hover:bg-white/[.06]"
          >
            <Link2 size={16} />
            Knop
          </button>
          <button
            type="button"
            onClick={() => addBlock("divider")}
            className="flex items-center gap-1.5 rounded-full border border-border bg-surface px-3 py-1.5 text-sm font-medium text-foreground hover:bg-black/[.03] dark:hover:bg-white/[.06]"
          >
            <Minus size={16} />
            Scheidingslijn
          </button>
        </div>
      )}

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
  );
}
