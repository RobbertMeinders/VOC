"use client";

import { useEffect, useId, useRef, useState, type ClipboardEvent, type KeyboardEvent } from "react";
import { searchMentionsAction } from "@/app/(app)/actions";
import { MentionDropdown } from "./MentionDropdown";
import { createMentionChip, populateMentionEditor, serializeMentionEditor } from "@/lib/feed/mentionDom";
import { flattenMentionResults, mentionOptionId, type MentionKind, type MentionResults } from "@/lib/feed/mentionTypes";

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
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const queryRangeRef = useRef<{ node: Text; start: number; end: number } | null>(null);
  const requestId = useRef(0);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const listboxId = useId();
  const flatResults = flattenMentionResults(results);

  useEffect(() => {
    const root = editorRef.current;
    if (!root) return;
    populateMentionEditor(root, defaultValue ?? "");
    if (hiddenInputRef.current) hiddenInputRef.current.value = defaultValue ?? "";
    if (autoFocus) root.focus();
    // Alleen bij het mounten — dit veld is daarna uncontrolled (eigen DOM-state).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
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
      if (debounceRef.current) clearTimeout(debounceRef.current);
      setOpen(false);
      queryRangeRef.current = null;
      return;
    }

    const textBeforeCaret = (anchorNode.textContent ?? "").slice(0, anchorOffset);
    const match = /(?:^|\s)@([^\s@]{0,40})$/.exec(textBeforeCaret);
    if (!match) {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      setOpen(false);
      queryRangeRef.current = null;
      return;
    }

    const start = anchorOffset - match[1].length - 1;
    queryRangeRef.current = { node: anchorNode as Text, start, end: anchorOffset };
    setOpen(true);
    setHighlightedIndex(0);

    // Gedebouncet i.p.v. bij elke toetsaanslag meteen te zoeken — zonder dit
    // vuurde elk toetsaanslag zowel via het input- als het keyup-event een
    // eigen serververzoek af (zie handleInput/handleKeyUp), wat de suggesties
    // merkbaar traag liet aanvoelen. requestId blijft de bescherming tegen
    // een verouderd antwoord dat een nieuwer overschrijft.
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const query = match[1];
    debounceRef.current = setTimeout(() => {
      const requestNumber = ++requestId.current;
      void searchMentionsAction(query).then((result) => {
        if (requestNumber === requestId.current) {
          setResults(result);
          setHighlightedIndex(0);
        }
      });
    }, 150);
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

    if (debounceRef.current) clearTimeout(debounceRef.current);
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
    // ARIA-combobox-toetsenbordbediening: alleen relevant terwijl de
    // suggestielijst open staat, en vóór de bestaande Enter-afhandeling
    // hieronder (anders zou Enter een suggestie negeren en in plaats daarvan
    // versturen/een regeleinde invoegen).
    if (open && flatResults.length > 0) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setHighlightedIndex((i) => (i + 1) % flatResults.length);
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setHighlightedIndex((i) => (i - 1 + flatResults.length) % flatResults.length);
        return;
      }
      if (e.key === "Enter") {
        e.preventDefault();
        const option = flatResults[highlightedIndex];
        if (option) handleSelect(option.name, option.kind, option.id);
        return;
      }
      if (e.key === "Escape") {
        e.preventDefault();
        setOpen(false);
        queryRangeRef.current = null;
        return;
      }
    }

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
        role="combobox"
        aria-label={placeholder}
        aria-expanded={open}
        aria-controls={open ? listboxId : undefined}
        aria-activedescendant={
          open && flatResults[highlightedIndex] ? mentionOptionId(listboxId, flatResults[highlightedIndex].kind, flatResults[highlightedIndex].id) : undefined
        }
        aria-autocomplete="list"
        data-placeholder={placeholder}
        onInput={handleInput}
        onKeyUp={handleKeyUp}
        onKeyDown={handleKeyDown}
        onPaste={handlePaste}
        onBlur={() => window.setTimeout(() => setOpen(false), 120)}
        suppressContentEditableWarning
        style={maxHeight ? { maxHeight, overflowY: "auto" } : undefined}
        className={`mention-editor ${minHeightClassName} w-full resize-none break-words rounded-2xl border border-input-border bg-background px-3.5 py-1.5 text-sm text-foreground focus:border-petrol focus:outline-none focus:ring-2 focus:ring-petrol/20`}
      />
      <input ref={hiddenInputRef} type="hidden" name={name} />
      {open && (
        <MentionDropdown listboxId={listboxId} results={results} highlightedIndex={highlightedIndex} onSelect={handleSelect} />
      )}
    </div>
  );
}
