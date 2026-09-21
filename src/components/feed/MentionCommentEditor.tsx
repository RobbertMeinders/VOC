"use client";

import { useRef, useState, type KeyboardEvent, type ClipboardEvent } from "react";
import { searchMentionsAction } from "@/app/(app)/actions";
import { MentionDropdown } from "./MentionDropdown";
import { createMentionChip, serializeMentionEditor } from "@/lib/feed/mentionDom";
import type { MentionKind, MentionResults } from "@/lib/feed/useMentionField";

/**
 * Single-line, contenteditable comment field with @mention support: unlike
 * the plain <input>/<textarea> fields (PostComposer, EditPostForm), a chosen
 * mention renders here as a real chip while still typing — not the raw
 * "@[Naam](kind:id)" storage syntax — because the field IS the DOM, not a
 * React-controlled string. The hidden input mirrors that DOM back into the
 * same storage syntax on every keystroke, so form submission (FormData)
 * works exactly like the plain fields elsewhere.
 *
 * Kept single-line on purpose: Enter is intercepted to submit instead of
 * inserting a line break, which sidesteps the much harder problem of
 * serializing multi-line contenteditable content correctly across browsers.
 */
export function MentionCommentEditor({
  name,
  placeholder,
  onEnter,
}: {
  name: string;
  placeholder: string;
  onEnter: () => void;
}) {
  const editorRef = useRef<HTMLDivElement>(null);
  const hiddenInputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [results, setResults] = useState<MentionResults>({ profiles: [], companies: [] });
  const queryRangeRef = useRef<{ node: Text; start: number; end: number } | null>(null);
  const requestId = useRef(0);

  function sync() {
    const root = editorRef.current;
    if (!root || !hiddenInputRef.current) return;
    hiddenInputRef.current.value = serializeMentionEditor(root);
  }

  function handleInput() {
    sync();

    const selection = window.getSelection();
    const anchorNode = selection?.anchorNode;
    const anchorOffset = selection?.anchorOffset ?? 0;
    if (!anchorNode || anchorNode.nodeType !== Node.TEXT_NODE || !editorRef.current?.contains(anchorNode)) {
      setOpen(false);
      queryRangeRef.current = null;
      return;
    }

    const textBeforeCaret = (anchorNode.textContent ?? "").slice(0, anchorOffset);
    const match = /(?:^|\s)@([^\s@]{0,40})$/.exec(textBeforeCaret);
    if (!match) {
      setOpen(false);
      queryRangeRef.current = null;
      return;
    }

    const start = anchorOffset - match[1].length - 1;
    queryRangeRef.current = { node: anchorNode as Text, start, end: anchorOffset };
    setOpen(true);
    const requestNumber = ++requestId.current;
    void searchMentionsAction(match[1]).then((result) => {
      if (requestNumber === requestId.current) setResults(result);
    });
  }

  function handleSelect(mentionName: string, kind: MentionKind, id: string) {
    const range = queryRangeRef.current;
    const root = editorRef.current;
    if (!range || !root) return;

    const { node, start, end } = range;
    const after = node.splitText(end);
    node.deleteData(start, end - start);

    const chip = createMentionChip(mentionName, kind, id);
    const spaceNode = document.createTextNode(" ");
    node.parentNode?.insertBefore(chip, after);
    node.parentNode?.insertBefore(spaceNode, after);

    setOpen(false);
    queryRangeRef.current = null;
    sync();

    requestAnimationFrame(() => {
      root.focus();
      const selection = window.getSelection();
      const newRange = document.createRange();
      newRange.setStart(spaceNode, 1);
      newRange.collapse(true);
      selection?.removeAllRanges();
      selection?.addRange(newRange);
    });
  }

  function handleKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    if (e.key !== "Enter") return;
    e.preventDefault();
    if (!open) onEnter();
  }

  function handlePaste(e: ClipboardEvent<HTMLDivElement>) {
    e.preventDefault();
    const text = e.clipboardData.getData("text/plain").replace(/[\r\n]+/g, " ");
    document.execCommand("insertText", false, text);
  }

  return (
    <div className="relative flex-1">
      <div
        ref={editorRef}
        contentEditable
        role="textbox"
        aria-multiline="false"
        aria-label={placeholder}
        data-placeholder={placeholder}
        onInput={handleInput}
        onKeyDown={handleKeyDown}
        onPaste={handlePaste}
        onBlur={() => window.setTimeout(() => setOpen(false), 120)}
        suppressContentEditableWarning
        className="mention-editor min-h-9 w-full break-words rounded-2xl border border-border bg-background px-3.5 py-1.5 text-sm text-foreground focus:border-voc-red focus:outline-none focus:ring-2 focus:ring-voc-red/20"
      />
      <input ref={hiddenInputRef} type="hidden" name={name} />
      {open && <MentionDropdown results={results} onSelect={handleSelect} />}
    </div>
  );
}
