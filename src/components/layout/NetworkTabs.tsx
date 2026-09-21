"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { clsx } from "clsx";

const TABS = [
  { href: "/leden", label: "Leden" },
  { href: "/bedrijven", label: "Bedrijven" },
];

export function NetworkTabs() {
  const pathname = usePathname();

  return (
    <div className="mb-4 inline-flex rounded-lg border border-border bg-surface p-1">
      {TABS.map((tab) => {
        const active = pathname.startsWith(tab.href);
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={clsx(
              "rounded-md px-3 py-1.5 text-sm font-medium",
              active ? "bg-voc-red text-white" : "text-muted hover:text-foreground"
            )}
          >
            {tab.label}
          </Link>
        );
      })}
    </div>
  );
}
