"use client";

import { forwardRef, useEffect, useImperativeHandle, useRef, type ClipboardEvent } from "react";
import { clsx } from "clsx";
import { sanitizeEmailHtml } from "@/lib/html/sanitize";

// Stijlronde: Robbert wilde direct in het voorbeeld kunnen typen i.p.v. een
// los HTML-veld naast een losse preview, met knoppen om een variabele
// ({{link}}, {{title}}, {{body}}, ...) toe te voegen — en die variabele moet
// in het voorbeeld dan ook echt een voorbeeldtekst laten zien, niet de rauwe
// {{...}}-tekst. Dit component is dat: een contentEditable-vlak waarin elke
// variabele een niet-bewerkbare "chip" is (het voorbeeld, visueel duidelijk
// anders dan gewone tekst), terwijl de onderliggende waarde (voor opslaan)
// gewoon de {{key}}-tekst blijft.
//
// Bewust UNcontrolled na het eerste mounten: de inhoud wordt één keer als
// HTML neergezet en daarna nooit meer door React overschreven (de div krijgt
// zelf geen children/dangerouslySetInnerHTML-prop) — anders zou elke
// toetsaanslag (die via onChange de React-state bijwerkt) de cursorpositie
// resetten zodra die state weer teruggevoerd zou worden in de inhoud.

export type VariableDef = { key: string; label: string; example: string };
export type VariableEditorHandle = { insertVariable: (key: string) => void; insertHtml: (html: string) => void };

const CHIP_ATTR = "data-var";

function escapeHtml(text: string): string {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

function chipHtml(variable: VariableDef): string {
  return `<span ${CHIP_ATTR}="${variable.key}" contenteditable="false" class="var-chip">${escapeHtml(variable.example)}</span>`;
}

function chipFragment(variable: VariableDef): Node {
  const wrapper = document.createElement("span");
  wrapper.innerHTML = chipHtml(variable);
  return wrapper.firstChild as Node;
}

// {{key}}-tokens -> HTML met chips voor elke variabele die hier bekend is;
// een onbekend token (typefout, of een variabele die niet voor dit
// sjabloon geldt) blijft als platte, bewerkbare tekst staan i.p.v. te
// verdwijnen.
function tokensToEditableHtml(value: string, variables: VariableDef[], mode: "text" | "html"): string {
  const byKey = new Map(variables.map((v) => [v.key, v]));
  const pattern = /\{\{(\w+)\}\}/g;
  let result = "";
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(value))) {
    const [full, key] = match;
    const segment = value.slice(lastIndex, match.index);
    result += mode === "text" ? escapeHtml(segment).replaceAll("\n", "<br>") : segment;
    const variable = byKey.get(key);
    result += variable ? chipHtml(variable) : escapeHtml(full);
    lastIndex = match.index + full.length;
  }
  const tail = value.slice(lastIndex);
  result += mode === "text" ? escapeHtml(tail).replaceAll("\n", "<br>") : tail;
  return result;
}

// HTML (met chips) -> {{key}}-tokens terug, voor opslag.
function editableHtmlToTokens(container: HTMLElement, mode: "text" | "html"): string {
  const clone = container.cloneNode(true) as HTMLElement;
  clone.querySelectorAll(`[${CHIP_ATTR}]`).forEach((chip) => {
    chip.replaceWith(document.createTextNode(`{{${chip.getAttribute(CHIP_ATTR)}}}`));
  });
  if (mode === "html") return clone.innerHTML;

  // Platte tekst (pushbericht): <br> en blokelementen (die een browser bij
  // Enter kan invoegen) worden regeleinden, niet zomaar weggegooid.
  clone.querySelectorAll("br").forEach((br) => br.replaceWith(document.createTextNode("\n")));
  clone.querySelectorAll("div, p").forEach((el) => el.after(document.createTextNode("\n")));
  return (clone.textContent ?? "").replace(/\n{3,}/g, "\n\n").replace(/^\n+|\n+$/g, "");
}

export const VariableEditor = forwardRef<
  VariableEditorHandle,
  {
    initialValue: string;
    variables: VariableDef[];
    mode: "text" | "html";
    onChange: (value: string) => void;
    onFocus?: () => void;
    className?: string;
    "aria-label"?: string;
  }
>(function VariableEditor({ initialValue, variables, mode, onChange, onFocus, className, "aria-label": ariaLabel }, ref) {
  const elRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = elRef.current;
    if (!el) return;
    const seeded = tokensToEditableHtml(initialValue, variables, mode);
    // Opgeslagen HTML komt rechtstreeks in de echte beheerpagina terecht
    // (geen gesandboxte <iframe> meer zoals de vorige preview) — dus ook
    // al bestaande inhoud (van vóór deze opschoning, of hoe dan ook
    // ontstaan) loopt hier door de sanitizer, niet alleen nieuw geplakte
    // tekst (zie handlePaste hieronder).
    el.innerHTML = mode === "html" ? sanitizeEmailHtml(seeded) : seeded;
    // Zonder dit voegt Chrome bij Enter een <div> per regel toe i.p.v. <br> —
    // editableHtmlToTokens hierboven verwacht platte tekst met <br>'s.
    if (mode === "text") document.execCommand("defaultParagraphSeparator", false, "br");
    // Alleen bij mounten: zie uitleg hierboven over waarom dit NIET op elke
    // wijziging van initialValue/variables/mode mag reageren.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function emitChange() {
    if (!elRef.current) return;
    onChange(editableHtmlToTokens(elRef.current, mode));
  }

  // `node` mag een los element zijn (bv. een variabele-chip) of een
  // DocumentFragment met meerdere knopen (bv. een nieuwe-regel + <img>) —
  // de cursor komt na `cursorAfter` (bij een fragment: het laatste knooppunt
  // erin, want het fragment zelf bestaat niet meer na het invoegen).
  function insertNodeAtCursor(node: Node, cursorAfter: Node) {
    const el = elRef.current;
    if (!el) return;
    el.focus();
    const selection = window.getSelection();
    let range: Range;
    if (selection && selection.rangeCount > 0 && el.contains(selection.anchorNode)) {
      range = selection.getRangeAt(0);
    } else {
      range = document.createRange();
      range.selectNodeContents(el);
      range.collapse(false);
    }
    range.deleteContents();
    range.insertNode(node);
    range.setStartAfter(cursorAfter);
    range.collapse(true);
    selection?.removeAllRanges();
    selection?.addRange(range);
    emitChange();
  }

  useImperativeHandle(ref, () => ({
    insertVariable(key: string) {
      const variable = variables.find((v) => v.key === key);
      if (!variable) return;
      const node = chipFragment(variable);
      insertNodeAtCursor(node, node);
    },
    insertHtml(html: string) {
      const wrapper = document.createElement("span");
      // Ook hier opschonen (zie sanitizeEmailHtml): de aanroeper van deze
      // methode is vandaag alleen het logo-uploadje (eigen, veilige <img>),
      // maar insertHtml is een generieke API die later ook ergens anders
      // met minder gecontroleerde HTML aangeroepen kan worden.
      wrapper.innerHTML = sanitizeEmailHtml(html);
      const fragment = document.createDocumentFragment();
      let lastNode: Node | null = null;
      while (wrapper.firstChild) {
        lastNode = wrapper.firstChild;
        fragment.appendChild(lastNode);
      }
      if (lastNode) insertNodeAtCursor(fragment, lastNode);
    },
  }));

  // Platte tekst plakken i.p.v. meegeplakte opmaak van elders — ook in
  // mode "html": dit veld is een eenvoudig e-mailbericht ("geen HTML-
  // editor" was Robberts eigen uitgangspunt), niet een rich-text-document
  // waar willekeurige, mogelijk kwaadaardige markup (bv. een
  // <img onerror=...> uit een geplakte webpagina) zomaar in terecht mag
  // komen — dit rendert immers rechtstreeks, zonder sandbox, in de echte
  // beheerpagina (zie sanitizeEmailHtml hierboven voor de rest van de
  // opschoning).
  function handlePaste(e: ClipboardEvent) {
    e.preventDefault();
    document.execCommand("insertText", false, e.clipboardData.getData("text/plain"));
  }

  return (
    <div
      ref={elRef}
      contentEditable
      suppressContentEditableWarning
      role="textbox"
      aria-multiline={mode === "text"}
      aria-label={ariaLabel}
      onInput={emitChange}
      onFocus={onFocus}
      onPaste={handlePaste}
      className={clsx("min-h-6 whitespace-pre-wrap outline-none focus-visible:outline-none", className)}
    />
  );
});
