// UX-review U9: een rood getal alleen (bv. "1" op "Netwerk") zegt niet
// waarover het gaat; `label` geeft een hover-tooltip met wat de telling
// betekent (bv. "1 ongelezen melding over het netwerk").
export function NavBadge({ count, label }: { count: number; label?: string }) {
  if (count <= 0) return null;
  return (
    <span
      title={label}
      className="flex h-5 min-w-5 items-center justify-center rounded-full bg-voc-red px-1.5 text-xs font-medium text-white"
    >
      {count > 9 ? "9+" : count}
    </span>
  );
}
