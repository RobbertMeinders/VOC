import Link from "next/link";
import { Fragment, type ReactNode } from "react";
import { MENTION_PATTERN_SOURCE } from "@/lib/feed/mentions";

/**
 * Renders feed content, turning "@[Naam](profiel:uuid)" / "@[Naam](bedrijf:uuid)"
 * mention tokens (inserted by the composer's @-autocomplete) into links,
 * and everything else as plain text.
 *
 * Geanonimiseerd-lid-audit: `anonymizedIds` zijn de profiel-id's uit deze
 * tekst die inmiddels geanonimiseerd zijn (queries.ts bepaalt dat server-
 * side, zie extractMentionedProfileIds) -- zo'n vermelding wordt platte
 * tekst i.p.v. een link naar de (niet meer bestaande) profielpagina. De
 * ooit getypte naam blijft wel gewoon staan (bestaande content wijzigt
 * niet met terugwerkende kracht, zelfde uitgangspunt als bij een
 * geanonimiseerde berichtauteur), alleen de link verdwijnt.
 */
export function MentionedText({ text, anonymizedIds = [] }: { text: string; anonymizedIds?: string[] }) {
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
    if (kind === "profiel" && anonymizedIds.includes(id)) {
      nodes.push(<span key={key++} className="font-medium text-foreground">{name}</span>);
    } else {
      const href = kind === "profiel" ? `/leden/${id}` : `/bedrijven/${id}`;
      nodes.push(
        <Link key={key++} href={href} className="font-medium text-petrol hover:underline">
          {name}
        </Link>
      );
    }
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < text.length) {
    nodes.push(<Fragment key={key++}>{text.slice(lastIndex)}</Fragment>);
  }

  return <>{nodes}</>;
}
