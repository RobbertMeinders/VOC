import type { MentionKind } from "./mentionTypes";

/** data-* attribute names used on an inserted mention chip <span>. */
export const MENTION_ID_ATTR = "data-mention-id";
export const MENTION_KIND_ATTR = "data-mention-kind";
export const MENTION_NAME_ATTR = "data-mention-name";

const MENTION_TOKEN_PATTERN = /@\[([^\]]+)\]\((profiel|bedrijf):([0-9a-fA-F-]{36})\)/g;

/**
 * Serializes a (possibly multi-line) contenteditable's content back into the
 * "@[Naam](kind:id)" storage syntax (see MentionedText/mention triggers):
 * text nodes pass through as-is, mention chip <span>s become the bracket
 * syntax, a <br> becomes a newline, and any other element (paste/IME edge
 * cases) contributes only its text.
 */
export function serializeMentionEditor(root: HTMLElement): string {
  let result = "";
  for (const node of Array.from(root.childNodes)) {
    if (node.nodeType === Node.TEXT_NODE) {
      result += node.textContent ?? "";
      continue;
    }
    if (node.nodeType !== Node.ELEMENT_NODE) continue;
    const el = node as HTMLElement;
    if (el.tagName === "BR") {
      result += "\n";
      continue;
    }
    const id = el.getAttribute(MENTION_ID_ATTR);
    const kind = el.getAttribute(MENTION_KIND_ATTR);
    const name = el.getAttribute(MENTION_NAME_ATTR);
    if (id && kind && name) {
      result += `@[${name}](${kind}:${id})`;
    } else {
      // Block-level elements (a stray <div>/<p>) each represent their own
      // line — shouldn't normally occur since Enter is handled explicitly,
      // but browsers occasionally insert them anyway (paste, autocorrect).
      result += (el.textContent ?? "") + "\n";
    }
  }
  return result;
}

export function createMentionChip(name: string, kind: MentionKind, id: string): HTMLSpanElement {
  const chip = document.createElement("span");
  chip.setAttribute(MENTION_ID_ATTR, id);
  chip.setAttribute(MENTION_KIND_ATTR, kind);
  chip.setAttribute(MENTION_NAME_ATTR, name);
  chip.contentEditable = "false";
  chip.className = "rounded bg-voc-red-light px-1 py-0.5 font-medium text-voc-red";
  chip.textContent = `@${name}`;
  return chip;
}

/**
 * Populates a (typically freshly mounted, empty) contenteditable with the
 * "@[Naam](kind:id)" storage syntax, rendering each mention token as the
 * same chip the live @-autocomplete inserts — used to open an existing
 * post/reactie for editing without the raw bracket syntax showing up in the
 * field (see serializeMentionEditor for the inverse).
 */
export function populateMentionEditor(root: HTMLElement, text: string): void {
  root.textContent = "";
  const lines = text.split("\n");
  lines.forEach((line, lineIndex) => {
    let lastIndex = 0;
    const pattern = new RegExp(MENTION_TOKEN_PATTERN.source, "g");
    let match: RegExpExecArray | null;
    while ((match = pattern.exec(line))) {
      if (match.index > lastIndex) {
        root.appendChild(document.createTextNode(line.slice(lastIndex, match.index)));
      }
      const [, name, kind, id] = match;
      root.appendChild(createMentionChip(name, kind as MentionKind, id));
      lastIndex = match.index + match[0].length;
    }
    if (lastIndex < line.length || (lastIndex === 0 && line.length === 0 && lines.length === 1)) {
      root.appendChild(document.createTextNode(line.slice(lastIndex)));
    }
    if (lineIndex < lines.length - 1) {
      root.appendChild(document.createElement("br"));
    }
  });
}
