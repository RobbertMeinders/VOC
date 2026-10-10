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
// met de lichtere filter-pills eronder.
export function NetworkTabs() {
  const pathname = usePathname();

  return (
    <div className="mb-4 flex rounded-xl border border-border bg-surface p-1">
      {TABS.map((tab) => {
        const active = pathname.startsWith(tab.href);
        const Icon = tab.icon;
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={clsx(
              "flex flex-1 items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-sm font-semibold",
              active
                ? "bg-voc-red text-white shadow-sm"
                : "text-muted hover:bg-black/[.04] hover:text-foreground dark:hover:bg-white/[.06]"
            )}
          >
            <Icon size={16} />
            {tab.label}
          </Link>
        );
      })}
    </div>
  );
}
