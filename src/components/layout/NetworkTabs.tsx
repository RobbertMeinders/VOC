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
// Redesign-besluit 5: geen gevuld rood meer — de "track met een
// surface+schaduw-pil op de actieve stand" van SegmentedControl, maar hier
// rechtstreeks gestyled i.p.v. via dat component, want dit heeft eigen
// iconen en responsive maten die SegmentedControl bewust niet aanbiedt
// (die blijft de simpele, generieke variant).
export function NetworkTabs() {
  const pathname = usePathname();

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
              active ? "bg-surface text-foreground shadow-sm" : "text-muted hover:text-foreground"
            )}
          >
            <Icon className="h-4 w-4 lg:h-[18px] lg:w-[18px]" />
            {tab.label}
          </Link>
        );
      })}
    </div>
  );
}
