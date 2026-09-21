"use client";

import { useRef, useState } from "react";
import { searchMentionsAction, type MentionSuggestion } from "@/app/(app)/actions";

export type MentionResults = { profiles: MentionSuggestion[]; companies: MentionSuggestion[] };
export type MentionKind = "profiel" | "bedrijf";

function matchActiveQuery(text: string, caret: number): { query: string; start: number } | null {
  const uptoCaret = text.slice(0, caret);
  const match = /(?:^|\s)@([^\s@]{0,40})$/.exec(uptoCaret);
  if (!match) return null;
  return { query: match[1], start: caret - match[1].length - 1 };
}

/**
 * Drives the "@" mention dropdown for a plain (uncontrolled-by-form,
 * React-controlled) text field. The caller owns the value/onValueChange
 * state; this hook only watches the caret position to open/close the
 * dropdown and know where to splice the inserted mention token back in.
 */
export function useMentionField(value: string, onValueChange: (value: string) => void) {
  const [open, setOpen] = useState(false);
  const [queryStart, setQueryStart] = useState(0);
  const [results, setResults] = useState<MentionResults>({ profiles: [], companies: [] });
  const requestId = useRef(0);

  function handleInput(target: HTMLInputElement | HTMLTextAreaElement) {
    const next = target.value;
    onValueChange(next);

    const caret = target.selectionStart ?? next.length;
    const active = matchActiveQuery(next, caret);
    if (!active) {
      setOpen(false);
      return;
    }

    setQueryStart(active.start);
    setOpen(true);
    const requestNumber = ++requestId.current;
    void searchMentionsAction(active.query).then((result) => {
      if (requestNumber === requestId.current) setResults(result);
    });
  }

  function select(target: HTMLInputElement | HTMLTextAreaElement, name: string, kind: MentionKind, id: string) {
    const caret = target.selectionStart ?? value.length;
    const mentionText = `@[${name}](${kind}:${id}) `;
    const next = value.slice(0, queryStart) + mentionText + value.slice(caret);
    onValueChange(next);
    setOpen(false);

    requestAnimationFrame(() => {
      const pos = queryStart + mentionText.length;
      target.focus();
      target.setSelectionRange(pos, pos);
    });
  }

  const hasResults = results.profiles.length > 0 || results.companies.length > 0;

  return { open: open && hasResults, results, handleInput, select, close: () => setOpen(false) };
}
