import Link from "next/link";
import { ChevronRight } from "lucide-react";

// Herbruikbare sectiekop met een tekstlink rechts i.p.v. een losse knop
// onder de sectie-inhoud (bv. Home: "Nieuws" -> "Alle nieuws").
export function SectionHeader({ title, href, linkLabel }: { title: string; href: string; linkLabel: string }) {
  return (
    <div className="mb-2 flex items-baseline justify-between gap-2">
      {/* Redesign: sectiekoppen in de kopletter; de tekstlink was rood, wordt
          petrol (rood is schaars geworden). Stijlronde "zelfde indeling,
          nieuwe stijl": iets groter (19px) en strakker (tracking -0.015em),
          zelfde regel voor elke sectiekop in de app. */}
      <h2 className="font-display min-w-0 truncate text-[19px] font-bold tracking-[-0.015em] text-foreground">{title}</h2>
      <Link
        href={href}
        className="flex shrink-0 items-center gap-0.5 whitespace-nowrap text-sm font-medium text-petrol hover:underline"
      >
        {linkLabel}
        <ChevronRight size={14} />
      </Link>
    </div>
  );
}
