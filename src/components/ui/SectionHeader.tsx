import Link from "next/link";
import { ChevronRight } from "lucide-react";

// Herbruikbare sectiekop met een tekstlink rechts i.p.v. een losse knop
// onder de sectie-inhoud (bv. Home: "Nieuws" -> "Alle nieuws").
export function SectionHeader({ title, href, linkLabel }: { title: string; href: string; linkLabel: string }) {
  return (
    <div className="mb-2 flex items-baseline justify-between gap-2">
      <h2 className="min-w-0 truncate text-sm font-semibold text-foreground">{title}</h2>
      <Link
        href={href}
        className="flex shrink-0 items-center gap-0.5 whitespace-nowrap text-sm font-medium text-voc-red-text hover:underline"
      >
        {linkLabel}
        <ChevronRight size={14} />
      </Link>
    </div>
  );
}
