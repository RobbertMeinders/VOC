"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import { Send } from "lucide-react";
import { createCommentAction, type CreateCommentState } from "@/app/(app)/actions";
import { MentionEditor } from "./MentionEditor";
import type { FeedComment } from "@/lib/feed/types";

const initialState: CreateCommentState = {};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-voc-red-text hover:bg-voc-red-light disabled:opacity-50"
      aria-label="Reactie plaatsen"
    >
      <Send size={16} />
    </button>
  );
}

/**
 * Wrapper that remounts the actual form (via `key`) after every successful
 * comment — same reset pattern as PostComposer — since the contenteditable
 * field manages its own DOM state, not React state that could just be
 * cleared with setState.
 */
export function CommentForm({ postId, onCreated }: { postId: string; onCreated: (comment: FeedComment) => void }) {
  const [formKey, setFormKey] = useState(0);
  return (
    <CommentFormInner
      key={formKey}
      postId={postId}
      onPosted={(comment) => {
        onCreated(comment);
        setFormKey((k) => k + 1);
      }}
    />
  );
}

function CommentFormInner({ postId, onPosted }: { postId: string; onPosted: (comment: FeedComment) => void }) {
  const createWithPostId = createCommentAction.bind(null, postId);
  const [state, formAction] = useActionState(createWithPostId, initialState);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.success && state.comment) onPosted(state.comment);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  return (
    <div className="flex flex-col gap-1">
      <form ref={formRef} action={formAction} className="flex items-center gap-2">
        <MentionEditor
          name="content"
          placeholder="Schrijf een reactie…"
          singleLine
          onEnter={() => formRef.current?.requestSubmit()}
        />
        <SubmitButton />
      </form>
      {state.error && (
        <p role="alert" className="text-xs text-danger-text">
          {state.error}
        </p>
      )}
    </div>
  );
}
