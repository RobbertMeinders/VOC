"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import { Send } from "lucide-react";
import { createCommentAction, type CreateCommentState } from "@/app/(app)/actions";
import { MentionCommentEditor } from "./MentionCommentEditor";

const initialState: CreateCommentState = {};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-voc-red hover:bg-voc-red-light disabled:opacity-50"
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
export function CommentForm({ postId }: { postId: string }) {
  const [formKey, setFormKey] = useState(0);
  return <CommentFormInner key={formKey} postId={postId} onPosted={() => setFormKey((k) => k + 1)} />;
}

function CommentFormInner({ postId, onPosted }: { postId: string; onPosted: () => void }) {
  const createWithPostId = createCommentAction.bind(null, postId);
  const [state, formAction] = useActionState(createWithPostId, initialState);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.success) onPosted();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  return (
    <form ref={formRef} action={formAction} className="flex items-center gap-2">
      <MentionCommentEditor
        name="content"
        placeholder="Schrijf een reactie…"
        onEnter={() => formRef.current?.requestSubmit()}
      />
      <SubmitButton />
    </form>
  );
}
