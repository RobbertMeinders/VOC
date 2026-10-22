"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { clsx } from "clsx";
import { Users, Building2 } from "lucide-react";

const TABS = [
  { href: "/leden", label: "Leden", icon: Users },
  { href: "/bedrijven", label: "Bedrijven", icon: Building2 },
];

// UX-review: deze toggle wisselt tussen twee volledig andere lijsten (geen
// filter binnen één lijst, zoals Lijst/Kaart hieronder) — daarom bewust
// steviger (volle breedte, groter, met icoon) zodat hij niet verward wordt
// met de lichtere filter-pills eronder. Vanaf lg (echte desktopbreedte, niet
// al bij sm/tablet) nog een extra stap groter — op een brede pagina oogde
// hij anders verdwaald tussen de kop en alle witruimte eromheen.
// Ontwerpfeedback (netwerk-schakelaar-petrol.png): de actieve stand is een
// gevuld vlak met witte tekst/icoon i.p.v. de neutrale surface-pil — dit is
// dé bepalende keuze op de pagina (welke volledig andere lijst je ziet),
// dus mag opvallender dan de subtiele, generieke SegmentedControl. Het
// aantal achter elk label staat als klein pilletje — wit/20% op de actieve
// stand, een zachte vlakkleur op de inactieve.
//
// Identiteit Fase 2 ("rood voert, petrol draagt"): het gevulde vlak is nu
// rood i.p.v. petrol — deze gekozen-stand-schakelaar is één van de bewust
// beperkte "rode ankers", zie ook BedrijvenView (Lijst/Kaart).
export function NetworkTabs({ ledenCount, bedrijvenCount }: { ledenCount: number; bedrijvenCount: number }) {
  const pathname = usePathname();
  const counts: Record<string, number> = { "/leden": ledenCount, "/bedrijven": bedrijvenCount };

  return (
    <div className="mb-4 flex rounded-xl bg-raised p-1 sm:inline-flex lg:rounded-2xl lg:p-1.5">
      {TABS.map((tab) => {
        const active = pathname.startsWith(tab.href);
        const Icon = tab.icon;
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={clsx(
              "flex flex-1 items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-sm font-semibold sm:flex-none sm:px-4 sm:py-2.5 sm:text-[0.9375rem] lg:gap-2 lg:rounded-xl lg:px-6 lg:py-3 lg:text-base",
              active ? "bg-voc-red text-white shadow-sm" : "text-muted hover:text-foreground"
            )}
          >
            <Icon className="h-4 w-4 lg:h-[18px] lg:w-[18px]" />
            {tab.label}
            <span
              className={clsx(
                "rounded-full px-1.5 py-0.5 text-xs font-semibold tabular-nums",
                active ? "bg-white/20 text-white" : "bg-black/[.06] dark:bg-white/10"
              )}
            >
              {counts[tab.href]}
            </span>
          </Link>
        );
      })}
    </div>
  );
}
