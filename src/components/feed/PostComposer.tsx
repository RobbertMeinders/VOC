"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import { FileText, Image as ImageIcon, X } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { createPostAction, type CreatePostState } from "@/app/(app)/actions";
import { compressInputFile } from "@/lib/image/compress";
import { autoGrowTextarea } from "@/lib/dom/autoGrow";
import { PostTypePicker } from "./PostTypePicker";
import type { FeedAuthor, FeedPost } from "@/lib/feed/types";

const initialState: CreatePostState = {};

const TEXTAREA_MAX_HEIGHT = 160; // ~7 lines, then it scrolls instead of growing further

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="sm" disabled={pending}>
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
  const [state, formAction] = useActionState(createPostAction, initialState);
  const [fileName, setFileName] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (state.success && state.post) {
      onCreated(state.post);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  return (
    <form action={formAction} className="rounded-2xl border border-border bg-surface p-4 shadow-sm">
      <div className="flex items-start gap-3">
        <Avatar firstName={author.first_name} lastName={author.last_name} avatarUrl={author.avatarUrl} size={40} />
        <textarea
          name="content"
          rows={2}
          required
          placeholder="Wat wil je delen met het netwerk?"
          onInput={(e) => autoGrowTextarea(e.currentTarget, TEXTAREA_MAX_HEIGHT)}
          className="flex-1 resize-none overflow-y-auto rounded-xl border border-border bg-background px-4 py-2.5 text-sm text-foreground placeholder:text-muted focus:border-voc-red focus:outline-none focus:ring-2 focus:ring-voc-red/20"
          style={{ maxHeight: TEXTAREA_MAX_HEIGHT }}
        />
      </div>

      <div className="ml-[52px] mt-2">
        <PostTypePicker />
      </div>

      {fileName && (
        <div className="ml-[52px] mt-2 flex items-center gap-2 rounded-lg bg-black/[.04] px-3 py-1.5 text-xs text-muted dark:bg-white/[.06]">
          <FileText size={14} />
          <span className="flex-1 truncate">{fileName}</span>
          <button
            type="button"
            onClick={() => {
              setFileName(null);
              if (fileInputRef.current) fileInputRef.current.value = "";
            }}
            className="text-muted hover:text-voc-red"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {state.error && (
        <p role="alert" className="ml-[52px] mt-2 rounded-lg bg-voc-red-light px-3 py-2 text-sm text-voc-red">
          {state.error}
        </p>
      )}

      <div className="ml-[52px] mt-3 flex items-center justify-between">
        <label className="flex cursor-pointer items-center gap-1.5 rounded-full px-2.5 py-1.5 text-xs font-medium text-muted hover:bg-black/[.04] dark:hover:bg-white/[.06]">
          <ImageIcon size={16} />
          Foto of PDF
          <input
            ref={fileInputRef}
            type="file"
            name="attachment"
            accept="image/png,image/jpeg,image/webp,application/pdf"
            className="sr-only"
            onChange={async (e) => {
              const input = e.target;
              const compressed = await compressInputFile(input);
              setFileName(compressed?.name ?? null);
            }}
          />
        </label>
        <SubmitButton />
      </div>
    </form>
  );
}
