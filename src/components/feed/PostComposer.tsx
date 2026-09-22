"use client";

import { useActionState, useEffect, useRef, useState, type DragEvent } from "react";
import { useFormStatus } from "react-dom";
import { clsx } from "clsx";
import { FileText, Upload, X } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { useEscapeKey } from "@/lib/dom/useEscapeKey";
import { useBodyScrollLock } from "@/lib/dom/useBodyScrollLock";
import { createPostAction, type CreatePostState } from "@/app/(app)/actions";
import { compressImageFile } from "@/lib/image/compress";
import { MentionEditor } from "./MentionEditor";
import { PostTypePicker } from "./PostTypePicker";
import type { FeedAuthor, FeedPost, FeedPostType } from "@/lib/feed/types";

const initialState: CreatePostState = {};

const TEXTAREA_MAX_HEIGHT = 220;
const ACCEPTED_TYPES = ["image/png", "image/jpeg", "image/webp", "application/pdf"];
const MAX_ATTACHMENTS = 10;

type Preview = { url: string; name: string; isImage: boolean };

function SubmitButton({ disabled }: { disabled: boolean }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="sm" disabled={pending || disabled}>
      {pending ? "Plaatsen…" : "Plaatsen"}
    </Button>
  );
}

/**
 * Wrapper that remounts the actual form (via `key`) after every successful
 * post, which is how the textarea/file input/local state get reset — rather
 * than resetting them by calling setState from an effect.
 */
export function PostComposer({ author, onCreated }: { author: FeedAuthor; onCreated: (post: FeedPost) => void }) {
  const [formKey, setFormKey] = useState(0);

  return (
    <PostComposerForm
      key={formKey}
      author={author}
      onCreated={(post) => {
        onCreated(post);
        setFormKey((k) => k + 1);
      }}
    />
  );
}

function PostComposerForm({ author, onCreated }: { author: FeedAuthor; onCreated: (post: FeedPost) => void }) {
  const [open, setOpen] = useState(false);
  const [state, formAction] = useActionState(createPostAction, initialState);
  const [previews, setPreviews] = useState<Preview[]>([]);
  const [dragActive, setDragActive] = useState(false);
  const [postType, setPostType] = useState<FeedPostType | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const previewUrlsRef = useRef<string[]>([]);

  useEscapeKey(open, () => setOpen(false));
  useBodyScrollLock(open);

  useEffect(() => {
    if (state.success && state.post) {
      onCreated(state.post);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  // Object-URLs voor de miniatuurvoorbeelden horen bij dit component-leven,
  // niet bij React state zelf — zonder expliciet opruimen blijven ze na een
  // her-render of unmount in het geheugen hangen.
  useEffect(() => {
    return () => {
      previewUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
    };
  }, []);

  function rebuildPreviews(files: File[]) {
    previewUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
    const next = files.map((file) => ({
      url: URL.createObjectURL(file),
      name: file.name,
      isImage: file.type.startsWith("image/"),
    }));
    previewUrlsRef.current = next.map((p) => p.url);
    setPreviews(next);
  }

  async function addFiles(newFiles: File[]) {
    const input = fileInputRef.current;
    if (!input) return;

    const existing = Array.from(input.files ?? []);
    const accepted = newFiles.filter((f) => ACCEPTED_TYPES.includes(f.type));
    const combined = [...existing, ...accepted].slice(0, MAX_ATTACHMENTS);

    const compressed = await Promise.all(combined.map((f) => compressImageFile(f)));

    const transfer = new DataTransfer();
    compressed.forEach((f) => transfer.items.add(f));
    input.files = transfer.files;
    rebuildPreviews(compressed);
  }

  function removeFile(index: number) {
    const input = fileInputRef.current;
    if (!input) return;
    const remaining = Array.from(input.files ?? []).filter((_, i) => i !== index);
    const transfer = new DataTransfer();
    remaining.forEach((f) => transfer.items.add(f));
    input.files = transfer.files;
    rebuildPreviews(remaining);
  }

  function handleDragOver(e: DragEvent<HTMLFormElement>) {
    if (!e.dataTransfer.types.includes("Files")) return;
    e.preventDefault();
    setDragActive(true);
  }

  function handleDragLeave(e: DragEvent<HTMLFormElement>) {
    if (e.currentTarget.contains(e.relatedTarget as Node)) return;
    setDragActive(false);
  }

  function handleDrop(e: DragEvent<HTMLFormElement>) {
    if (!e.dataTransfer.files.length) return;
    e.preventDefault();
    setDragActive(false);
    void addFiles(Array.from(e.dataTransfer.files));
  }

  // Compact veld i.p.v. het volledige formulier — pas bij klikken opent het
  // grotere, gedimde overlay eronder. Voorkomt dat de feed standaard met een
  // groot invoerformulier begint.
  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex w-full items-center gap-3 rounded-2xl border border-border bg-surface p-3 text-left shadow-sm hover:border-voc-red/40"
      >
        <Avatar firstName={author.first_name} lastName={author.last_name} avatarUrl={author.avatarUrl} size={36} />
        <span className="text-sm text-muted">Wat wil je delen met het netwerk?</span>
      </button>
    );
  }

  return (
    <>
      <div className="fixed inset-0 z-40 cursor-pointer bg-black/60 animate-fade-in" onClick={() => setOpen(false)} />
      <div className="fixed inset-x-3 top-1/2 z-50 -translate-y-1/2 sm:inset-x-0 sm:mx-auto sm:w-full sm:max-w-xl sm:px-3">
        <div className="animate-scale-in max-h-[85vh] overflow-y-auto rounded-2xl border border-border bg-surface shadow-lg">
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <p className="text-sm font-semibold text-foreground">Nieuw bericht</p>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Sluiten"
              className="flex h-7 w-7 items-center justify-center rounded-full text-muted hover:bg-black/[.04] hover:text-voc-red dark:hover:bg-white/[.08]"
            >
              <X size={16} />
            </button>
          </div>

          <form
            action={formAction}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={clsx("p-4", dragActive && "bg-voc-red-light")}
          >
            {dragActive && (
              <p className="mb-2 text-center text-xs font-medium text-voc-red">Zet bestanden hier neer om toe te voegen</p>
            )}
            <div className="flex items-start gap-3">
              <Avatar firstName={author.first_name} lastName={author.last_name} avatarUrl={author.avatarUrl} size={40} />
              <MentionEditor
                name="content"
                placeholder="Wat wil je delen met het netwerk?"
                minHeightClassName="min-h-24"
                maxHeight={TEXTAREA_MAX_HEIGHT}
                autoFocus
              />
            </div>

            <div className="mt-3 sm:ml-[52px]">
              <label className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border py-4 text-sm font-medium text-muted hover:border-voc-red hover:text-voc-red">
                <Upload size={22} />
                Foto&apos;s of PDF toevoegen
                <input
                  ref={fileInputRef}
                  type="file"
                  name="attachments"
                  multiple
                  accept={ACCEPTED_TYPES.join(",")}
                  className="sr-only"
                  onChange={(e) => {
                    void addFiles(Array.from(e.target.files ?? []));
                  }}
                />
              </label>

              {previews.length > 0 && (
                <div className="mt-2 grid grid-cols-4 gap-2 sm:grid-cols-5">
                  {previews.map((preview, index) => (
                    <div key={preview.url} className="relative aspect-square overflow-hidden rounded-lg border border-border bg-background">
                      {preview.isImage ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={preview.url} alt={preview.name} className="h-full w-full object-cover" />
                      ) : (
                        <div className="flex h-full w-full flex-col items-center justify-center gap-1 px-1 text-center">
                          <FileText size={18} className="text-voc-red" />
                          <span className="line-clamp-2 text-[10px] text-muted">{preview.name}</span>
                        </div>
                      )}
                      <button
                        type="button"
                        onClick={() => removeFile(index)}
                        aria-label="Verwijderen"
                        className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-black/60 text-white hover:bg-black/80"
                      >
                        <X size={12} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="mt-3 sm:ml-[52px]">
              <PostTypePicker required value={postType} onChange={setPostType} />
            </div>

            {state.error && (
              <p role="alert" className="mt-2 rounded-lg bg-voc-red-light px-3 py-2 text-sm text-voc-red sm:ml-[52px]">
                {state.error}
              </p>
            )}

            <div className="mt-3 flex items-center justify-end sm:ml-[52px]">
              <SubmitButton disabled={!postType} />
            </div>
          </form>
        </div>
      </div>
    </>
  );
}
