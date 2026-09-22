"use client";

import { useEffect, useRef, useState, type ClipboardEvent, type KeyboardEvent } from "react";
import { searchMentionsAction } from "@/app/(app)/actions";
import { MentionDropdown } from "./MentionDropdown";
import { createMentionChip, populateMentionEditor, serializeMentionEditor } from "@/lib/feed/mentionDom";
import type { MentionKind, MentionResults } from "@/lib/feed/mentionTypes";

/**
 * Contenteditable tekstveld met @mention-ondersteuning: een gekozen mention
 * rendert hier als een echte chip terwijl je nog typt, i.p.v. de ruwe
 * opslag-syntax "@[Naam](kind:id)" die je in een gewone <textarea> zou zien
 * zolang het veld niet is opgeslagen/herladen. `defaultValue` (bewerken van
 * een bestaand bericht/reactie) wordt bij het mounten omgezet naar diezelfde
 * chips via populateMentionEditor.
 *
 * Bij `singleLine` (reactieveld) onderschept Enter het versturen i.p.v. een
 * regeleinde in te voegen — single-line houdt de contenteditable-DOM simpel
 * te serialiseren. Zonder `singleLine` (bericht plaatsen/bewerken) voegt
 * Enter een <br> toe via insertLineBreak, voor consistent gedrag tussen
 * browsers t.o.v. het standaard Enter-gedrag van contenteditable (dat per
 * browser een <div>/<p> kan invoegen i.p.v. een simpele <br>).
 */
export function MentionEditor({
  name,
  placeholder,
  defaultValue,
  singleLine,
  onEnter,
  minHeightClassName = "min-h-9",
  maxHeight,
  autoFocus,
}: {
  name: string;
  placeholder: string;
  defaultValue?: string;
  singleLine?: boolean;
  onEnter?: () => void;
  minHeightClassName?: string;
  maxHeight?: number;
  autoFocus?: boolean;
}) {
  const editorRef = useRef<HTMLDivElement>(null);
  const hiddenInputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [results, setResults] = useState<MentionResults>({ profiles: [], companies: [] });
  const queryRangeRef = useRef<{ node: Text; start: number; end: number } | null>(null);
  const requestId = useRef(0);

  useEffect(() => {
    const root = editorRef.current;
    if (!root) return;
    populateMentionEditor(root, defaultValue ?? "");
    if (hiddenInputRef.current) hiddenInputRef.current.value = defaultValue ?? "";
    if (autoFocus) root.focus();
    // Alleen bij het mounten — dit veld is daarna uncontrolled (eigen DOM-state).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function sync() {
    const root = editorRef.current;
    if (!root || !hiddenInputRef.current) return;
    hiddenInputRef.current.value = serializeMentionEditor(root);
  }

  function detectMentionQuery() {
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

  function handleInput() {
    sync();
    detectMentionQuery();
  }

  // De caretpositie na een toetsaanslag is soms nog niet bijgewerkt op het
  // moment van het input-event (vooral op mobiel) — keyup vangt dat op.
  function handleKeyUp() {
    detectMentionQuery();
  }

  function handleSelect(mentionName: string, kind: MentionKind, id: string) {
    const range = queryRangeRef.current;
    const root = editorRef.current;
    if (!range || !root) return;

    const { node, start, end } = range;
    const after = node.splitText(end);
    node.deleteData(start, end - start);

    const chip = createMentionChip(mentionName, kind, id);
    const spaceNode = document.createTextNode(" ");
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
    if (singleLine) {
      e.preventDefault();
      if (!open) onEnter?.();
      return;
    }
    if (open) return;
    e.preventDefault();
    document.execCommand("insertLineBreak");
    sync();
  }

  function handlePaste(e: ClipboardEvent<HTMLDivElement>) {
    e.preventDefault();
    const text = e.clipboardData.getData("text/plain");
    document.execCommand("insertText", false, singleLine ? text.replace(/[\r\n]+/g, " ") : text);
  }

  return (
    <div className="relative flex-1">
      <div
        ref={editorRef}
        contentEditable
        role="textbox"
        aria-multiline={!singleLine}
        aria-label={placeholder}
        data-placeholder={placeholder}
        onInput={handleInput}
        onKeyUp={handleKeyUp}
        onKeyDown={handleKeyDown}
        onPaste={handlePaste}
        onBlur={() => window.setTimeout(() => setOpen(false), 120)}
        suppressContentEditableWarning
        style={maxHeight ? { maxHeight, overflowY: "auto" } : undefined}
        className={`mention-editor ${minHeightClassName} w-full resize-none break-words rounded-2xl border border-border bg-background px-3.5 py-1.5 text-sm text-foreground focus:border-voc-red focus:outline-none focus:ring-2 focus:ring-voc-red/20`}
      />
      <input ref={hiddenInputRef} type="hidden" name={name} />
      {open && <MentionDropdown results={results} onSelect={handleSelect} />}
    </div>
  );
}
