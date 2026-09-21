import type { MentionKind } from "./useMentionField";

/** data-* attribute names used on an inserted mention chip <span>. */
export const MENTION_ID_ATTR = "data-mention-id";
export const MENTION_KIND_ATTR = "data-mention-kind";
export const MENTION_NAME_ATTR = "data-mention-name";

/**
 * Serializes a single-line contenteditable's content back into the
 * "@[Naam](kind:id)" storage syntax (see MentionedText/mention triggers):
 * text nodes pass through as-is, mention chip <span>s become the bracket
 * syntax, anything else (a stray <br>/<div> — shouldn't happen since Enter
 * is intercepted, but paste/IME edge cases exist) contributes only its text.
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
    const id = el.getAttribute(MENTION_ID_ATTR);
    const kind = el.getAttribute(MENTION_KIND_ATTR);
    const name = el.getAttribute(MENTION_NAME_ATTR);
    if (id && kind && name) {
      result += `@[${name}](${kind}:${id})`;
    } else if (el.tagName !== "BR") {
      result += el.textContent ?? "";
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
