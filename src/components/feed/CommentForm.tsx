"use client";

import { useActionState, useEffect, useRef } from "react";
import { useFormStatus } from "react-dom";
import { Send } from "lucide-react";
import { createCommentAction, type CreateCommentState } from "@/app/(app)/actions";

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

export function CommentForm({ postId }: { postId: string }) {
  const createWithPostId = createCommentAction.bind(null, postId);
  const [state, formAction] = useActionState(createWithPostId, initialState);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.success) formRef.current?.reset();
  }, [state]);

  return (
    <form ref={formRef} action={formAction} className="flex items-center gap-2">
      <input
        name="content"
        required
        placeholder="Schrijf een reactie…"
        className="h-9 flex-1 rounded-full border border-border bg-background px-3.5 text-sm text-foreground placeholder:text-muted focus:border-voc-red focus:outline-none focus:ring-2 focus:ring-voc-red/20"
      />
      <SubmitButton />
    </form>
  );
}
