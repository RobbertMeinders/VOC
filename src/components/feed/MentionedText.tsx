import Link from "next/link";
import { Fragment, type ReactNode } from "react";

const MENTION_PATTERN_SOURCE = "@\\[([^\\]]+)\\]\\((profiel|bedrijf):([0-9a-fA-F-]{36})\\)";

/**
 * Renders feed content, turning "@[Naam](profiel:uuid)" / "@[Naam](bedrijf:uuid)"
 * mention tokens (inserted by the composer's @-autocomplete) into links,
 * and everything else as plain text.
 */
export function MentionedText({ text }: { text: string }) {
  const nodes: ReactNode[] = [];
  let lastIndex = 0;
  let key = 0;

  // A fresh RegExp per call, since `exec` on a global regex mutates its own
  // `lastIndex` — a module-level instance would carry state between calls.
  const pattern = new RegExp(MENTION_PATTERN_SOURCE, "g");
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(text))) {
    if (match.index > lastIndex) {
      nodes.push(<Fragment key={key++}>{text.slice(lastIndex, match.index)}</Fragment>);
    }
    const [, name, kind, id] = match;
    const href = kind === "profiel" ? `/leden/${id}` : `/bedrijven/${id}`;
    nodes.push(
      <Link key={key++} href={href} className="font-medium text-voc-red hover:underline">
        @{name}
      </Link>
    );
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < text.length) {
    nodes.push(<Fragment key={key++}>{text.slice(lastIndex)}</Fragment>);
  }

  return <>{nodes}</>;
}
