import Link from "next/link";
import { clsx } from "clsx";
import type { ReactNode } from "react";

type SegmentedItem = {
  key: string;
  label: ReactNode;
  active: boolean;
} & ({ href: string; onClick?: undefined } | { href?: undefined; onClick: () => void });

// Redesign-besluit 5: een 2(/3)-weg modusschakelaar (Leden/Bedrijven,
// Lijst/Kalender) — zachte "track" met een surface+schaduw-pil op de
// actieve stand, net als de periodekeuze op beheer/statistieken. Anders
// dan Chip (losse filter-chips, actief = inkt): dit is één samenhangend
// geheel voor "kies één van deze twee/drie standen".
export function SegmentedControl({ items, className }: { items: SegmentedItem[]; className?: string }) {
  return (
    <div className={clsx("inline-flex gap-1 rounded-xl bg-raised p-1", className)}>
      {items.map((item) => {
        const itemClassName = clsx(
          "flex-1 rounded-lg px-3 py-1.5 text-center text-sm font-medium transition-all",
          item.active ? "bg-surface text-foreground shadow-sm" : "text-muted hover:text-foreground"
        );
        if (item.href) {
          return (
            <Link key={item.key} href={item.href} className={itemClassName}>
              {item.label}
            </Link>
          );
        }
        return (
          <button key={item.key} type="button" onClick={item.onClick} className={itemClassName}>
            {item.label}
          </button>
        );
      })}
    </div>
  );
}
