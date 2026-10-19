import Link from "next/link";
import type { ReactNode } from "react";

// Herkent een kleine, bewust beperkte markdown-subset voor door een
// beheerder zelf geschreven paginatekst (zie app_settings.privacy_content):
// "## Kopje" -> tussenkop, een losse regel die in zijn geheel **vet** is ->
// óók een tussenkop (afwerkronde-rapport: bestaande tekst gebruikte vette
// regels als kopje, niet "## ", en plakte daardoor aan de volgende alinea
// vast), een losse regel "---" -> scheidingslijn, "[tekst](/pad)" -> link
// (intern via next/link, extern via <a>), **vet** -> nadruk, en verder
// gewone alinea's gescheiden door een lege regel. Geen volledige
// markdown-parser (geen lijsten/etc.) — precies genoeg voor een
// informatiepagina als Privacy & veiligheid, zonder een externe dependency.
function renderInline(text: string): ReactNode[] {
  const parts: ReactNode[] = [];
  // Link of **vet**, allebei in één doorloop zodat de volgorde in de tekst
  // bewaard blijft.
  const pattern = /\[([^\]]+)\]\(([^)]+)\)|\*\*([^*]+)\*\*/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let key = 0;
  while ((match = pattern.exec(text)) !== null) {
    if (match.index > lastIndex) parts.push(text.slice(lastIndex, match.index));
    const [, linkLabel, href, boldText] = match;
    if (boldText !== undefined) {
      parts.push(<strong key={key++}>{boldText}</strong>);
    } else {
      parts.push(
        href.startsWith("/") ? (
          <Link key={key++} href={href} className="font-medium text-petrol hover:underline">
            {linkLabel}
          </Link>
        ) : (
          <a key={key++} href={href} target="_blank" rel="noopener noreferrer" className="font-medium text-petrol hover:underline">
            {linkLabel}
          </a>
        )
      );
    }
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < text.length) parts.push(text.slice(lastIndex));
  return parts;
}

const SOLE_BOLD_LINE = /^\*\*([^*]+)\*\*$/;

export function renderLiteMarkdown(content: string): ReactNode[] {
  return content
    .trim()
    .split(/\n\s*\n/)
    .map((block, index) => {
      const trimmed = block.trim();
      if (trimmed === "---") {
        return <hr key={index} className="border-border" />;
      }
      if (trimmed.startsWith("## ")) {
        return (
          <h2 key={index} className="text-sm font-semibold text-foreground">
            {renderInline(trimmed.slice(3))}
          </h2>
        );
      }
      const soleBold = trimmed.match(SOLE_BOLD_LINE);
      if (soleBold) {
        return (
          <h2 key={index} className="text-sm font-semibold text-foreground">
            {soleBold[1]}
          </h2>
        );
      }
      return (
        <p key={index} className="text-sm leading-relaxed text-foreground">
          {renderInline(trimmed)}
        </p>
      );
    });
}
