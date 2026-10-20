import Link from "next/link";
import type { ReactNode } from "react";
import { StatusPill, type StatusTone } from "@/components/ui/StatusPill";
import type { SignalItem } from "@/lib/statistics/overview";

const TONE_MAP: Record<SignalItem["tone"], StatusTone> = { warning: "warning", neutral: "neutral", good: "success" };

// Signalen-lijst op Overzicht: tekstblok + pil, optioneel doorklikbaar —
// zelfde opbouw als "Wacht op jou" op het dashboard, maar dan voor dingen die
// aandacht *kunnen* verdienen i.p.v. acties die letterlijk op je wachten.
export function SignalsList({ items }: { items: SignalItem[] }) {
  if (items.length === 0) {
    return <p className="text-sm text-muted">Geen signalen — alles ziet er goed uit.</p>;
  }
  return (
    <div className="flex flex-col divide-y divide-border">
      {items.map((item) => {
        const row = (
          <div className="flex items-center gap-3 py-2.5 text-sm">
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium text-foreground">{item.label}</p>
              <p className="truncate text-xs text-muted">{item.sublabel}</p>
            </div>
            <StatusPill tone={TONE_MAP[item.tone]}>
              {item.tone === "good" ? "Populair" : `${item.count} ${item.count === 1 ? "lid" : "leden"}`}
            </StatusPill>
          </div>
        );
        return item.href ? (
          <Link key={item.label} href={item.href} className="-mx-1 rounded-lg px-1 hover:bg-black/[.03] dark:hover:bg-white/[.05]">
            {row}
          </Link>
        ) : (
          <div key={item.label}>{row}</div>
        );
      })}
    </div>
  );
}

export type IconStatItem = { icon: ReactNode; title: string; subtitle: string };

// "Bereik"-blok: een klein getal/label-tegeltje + tekst ernaast — zelfde
// opbouw als de "Deze week"-lijst op het dashboard.
export function IconStatList({ items }: { items: IconStatItem[] }) {
  return (
    <div className="flex flex-col divide-y divide-border">
      {items.map((item) => (
        <div key={item.title} className="flex items-center gap-3 py-2.5 text-sm">
          <div className="flex h-[46px] w-[42px] shrink-0 flex-col items-center justify-center rounded-xl bg-raised text-center leading-none">
            {item.icon}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate font-medium text-foreground">{item.title}</p>
            <p className="truncate text-xs text-muted">{item.subtitle}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
