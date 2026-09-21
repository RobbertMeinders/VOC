"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import { Send } from "lucide-react";
import { createCommentAction, type CreateCommentState } from "@/app/(app)/actions";
import { useMentionField } from "@/lib/feed/useMentionField";
import { MentionDropdown } from "./MentionDropdown";

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
  const [content, setContent] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const mention = useMentionField(content, setContent);

  useEffect(() => {
    if (state.success) {
      Promise.resolve().then(() => setContent(""));
    }
  }, [state]);

  return (
    <form action={formAction} className="flex items-center gap-2">
      <div className="relative flex-1">
        <input
          ref={inputRef}
          name="content"
          required
          value={content}
          placeholder="Schrijf een reactie… (typ @ om iemand te taggen)"
          onChange={(e) => mention.handleInput(e.currentTarget)}
          className="h-9 w-full rounded-full border border-border bg-background px-3.5 text-sm text-foreground placeholder:text-muted focus:border-voc-red focus:outline-none focus:ring-2 focus:ring-voc-red/20"
        />
        {mention.open && (
          <MentionDropdown
            results={mention.results}
            onSelect={(name, kind, id) => inputRef.current && mention.select(inputRef.current, name, kind, id)}
          />
        )}
      </div>
      <SubmitButton />
    </form>
  );
}
