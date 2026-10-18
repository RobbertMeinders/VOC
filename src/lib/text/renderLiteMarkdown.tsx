import Link from "next/link";
import type { ReactNode } from "react";

// Herkent een kleine, bewust beperkte markdown-subset voor door een
// beheerder zelf geschreven paginatekst (zie app_settings.privacy_content):
// "## Kopje" -> tussenkop, een losse regel "---" -> scheidingslijn,
// "[tekst](/pad)" -> link (intern via next/link, extern via <a>), en verder
// gewone alinea's gescheiden door een lege regel. Geen volledige
// markdown-parser (geen lijsten/nadruk/etc.) — precies genoeg voor een
// informatiepagina als Privacy & veiligheid, zonder een externe dependency.
function renderInline(text: string): ReactNode[] {
  const parts: ReactNode[] = [];
  const linkPattern = /\[([^\]]+)\]\(([^)]+)\)/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let key = 0;
  while ((match = linkPattern.exec(text)) !== null) {
    if (match.index > lastIndex) parts.push(text.slice(lastIndex, match.index));
    const [, label, href] = match;
    parts.push(
      href.startsWith("/") ? (
        <Link key={key++} href={href} className="font-medium text-voc-red-text hover:underline">
          {label}
        </Link>
      ) : (
        <a key={key++} href={href} target="_blank" rel="noopener noreferrer" className="font-medium text-voc-red-text hover:underline">
          {label}
        </a>
      )
    );
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < text.length) parts.push(text.slice(lastIndex));
  return parts;
}

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
      return (
        <p key={index} className="text-sm leading-relaxed text-foreground">
          {renderInline(trimmed)}
        </p>
      );
    });
}
