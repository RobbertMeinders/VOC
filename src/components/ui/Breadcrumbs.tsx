import Link from "next/link";
import { ChevronRight } from "lucide-react";

export type BreadcrumbItem = { label: string; href?: string };

// Puur wayfinding op geneste pagina's (bv. /beheer/...) — bewust NIET op
// overlay-routes (@modal/(.)...): die voelen aan als een laag boven de
// huidige pagina, niet als "een andere plek in de site" waar je een pad
// naartoe moet kunnen zien. Daarom leeft dit component alleen in page.tsx-
// bestanden zelf, nooit in de *Content.tsx die met een overlay wordt gedeeld.
export function Breadcrumbs({ items }: { items: BreadcrumbItem[] }) {
  return (
    <nav aria-label="Kruimelpad" className="mb-3 flex items-center gap-1 text-xs text-muted">
      {items.map((item, index) => (
        <span key={index} className="flex items-center gap-1">
          {index > 0 && <ChevronRight size={12} className="shrink-0" />}
          {item.href ? (
            <Link href={item.href} className="hover:text-voc-red hover:underline">
              {item.label}
            </Link>
          ) : (
            <span className="text-foreground">{item.label}</span>
          )}
        </span>
      ))}
    </nav>
  );
}
