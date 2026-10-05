"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { clsx } from "clsx";
import { ChevronDown } from "lucide-react";
import { useEscapeKey } from "@/lib/dom/useEscapeKey";
import { BEHEER_SECTIONS, type BeheerNavItem } from "./beheer-nav-items";

// Beheer-navigatie voor mobiel (zie BeheerLayout): een knop met de huidige
// sectie die de volledige, gegroepeerde lijst uitklapt, net als
// NetworkChooser's sidebar-variant — een horizontaal scrollbare pillenrij
// met 14 items over 6 secties bleek onhandig (geen sectiekoppen zichtbaar,
// veel heen-en-weer scrollen om iets te vinden). Op desktop zit dezelfde
// navigatie in de hoofd-Sidebar zelf (die schakelt om naar het Beheer-menu
// zodra je in /beheer/* zit) — hier dus alleen nog de mobiele variant.
export function BeheerSidebar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  function isActive(href: string) {
    if (href === "/beheer") return pathname === "/beheer";
    return pathname === href || pathname.startsWith(`${href}/`);
  }

  const activeItem = BEHEER_SECTIONS.flatMap((section) => section.items).find((item) => isActive(item.href));

  useEscapeKey(open, () => setOpen(false));

  function renderItem(item: BeheerNavItem, onNavigate?: () => void) {
    const active = isActive(item.href);
    const Icon = item.icon;
    return (
      <Link
        key={item.href}
        href={item.href}
        onClick={onNavigate}
        className={clsx(
          "flex items-center gap-2 whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium transition-all duration-150",
          active ? "bg-voc-red-light text-voc-red" : "text-foreground hover:bg-black/[.04] dark:hover:bg-white/[.06]"
        )}
      >
        <Icon size={16} strokeWidth={active ? 2.5 : 2} />
        {item.label}
      </Link>
    );
  }

  return (
    <div className="relative md:hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center gap-2 rounded-xl border border-border bg-surface px-3 py-2.5 text-sm font-medium text-foreground shadow-sm"
      >
        {activeItem && <activeItem.icon size={16} className="text-voc-red" />}
        {activeItem?.label ?? "Beheer"}
        <ChevronDown size={16} className={clsx("ml-auto transition-transform duration-200", open && "rotate-180")} />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="animate-fade-in absolute z-50 mt-2 flex max-h-[70vh] w-full flex-col gap-3 overflow-y-auto rounded-xl border border-border bg-surface p-2 shadow-lg">
            {BEHEER_SECTIONS.map((section) => (
              <div key={section.title}>
                <p className="px-3 pb-1 text-xs font-semibold uppercase tracking-wide text-muted">{section.title}</p>
                <div className="flex flex-col gap-0.5">
                  {section.items.map((item) => renderItem(item, () => setOpen(false)))}
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
