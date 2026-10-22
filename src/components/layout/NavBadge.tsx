import { clsx } from "clsx";

// UX-review U9: een rood getal alleen (bv. "1" op "Netwerk") zegt niet
// waarover het gaat; `label` geeft een hover-tooltip met wat de telling
// betekent (bv. "1 ongelezen melding over het netwerk").
//
// Identiteit Fase 2: `inverted` voor wanneer dit badge op een zelf al
// rode achtergrond staat (het actieve navigatie-item is nu een volle rode
// pill) — zonder dat zou een rood badge-cirkeltje onzichtbaar worden tegen
// een even rode ondergrond.
export function NavBadge({ count, label, inverted }: { count: number; label?: string; inverted?: boolean }) {
  if (count <= 0) return null;
  return (
    <span
      title={label}
      className={clsx(
        "flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-xs font-medium",
        inverted ? "bg-white text-voc-red-text" : "bg-voc-red text-white"
      )}
    >
      {count > 9 ? "9+" : count}
    </span>
  );
}
