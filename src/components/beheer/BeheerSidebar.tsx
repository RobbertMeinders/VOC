"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { clsx } from "clsx";
import { ChevronDown } from "lucide-react";
import { useEscapeKey } from "@/lib/dom/useEscapeKey";
import { BEHEER_SECTIONS, type BeheerNavItem } from "./beheer-nav-items";

// Permanent zij-menu voor alle /beheer/*-pagina's (zie BeheerLayout) i.p.v.
// een los kaartjes-overzicht op /beheer zelf. Op desktop een altijd
// zichtbare verticale kolom, direct naast de hoofdnavigatie. Op mobiel bleek
// een horizontaal scrollbare pillenrij met 14 items over 6 secties
// onhandig (geen sectiekoppen zichtbaar, veel heen-en-weer scrollen om iets
// te vinden) — daarom daar in plaats daarvan een knop met de huidige
// sectie die de volledige, gegroepeerde lijst inline uitklapt.
export function BeheerSidebar({ isAdmin }: { isAdmin: boolean }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  function isActive(href: string) {
    if (href === "/beheer") return pathname === "/beheer";
    return pathname === href || pathname.startsWith(`${href}/`);
  }

  // Secties zijn alleen een presentatie-groepering — een bestuurslid ziet
  // een sectie die daardoor helemaal leeg valt (bv. "Systeem") gewoon niet.
  const sections = BEHEER_SECTIONS.map((section) => ({
    ...section,
    items: section.items.filter((item) => isAdmin || !item.adminOnly),
  })).filter((section) => section.items.length > 0);

  const activeItem = sections.flatMap((section) => section.items).find((item) => isActive(item.href));

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
          active ? "bg-voc-red-light text-voc-red-text" : "text-foreground hover:bg-black/[.04] dark:hover:bg-white/[.06]"
        )}
      >
        <Icon size={16} strokeWidth={active ? 2.5 : 2} />
        {item.label}
      </Link>
    );
  }

  return (
    <>
      <div className="relative md:hidden">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          className="flex w-full items-center gap-2 rounded-xl border border-border bg-surface px-3 py-2.5 text-sm font-medium text-foreground shadow-sm"
        >
          {activeItem && <activeItem.icon size={16} className="text-voc-red-text" />}
          {activeItem?.label ?? "Beheer"}
          <ChevronDown size={16} className={clsx("ml-auto transition-transform duration-200", open && "rotate-180")} />
        </button>
        {open && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
            <div className="animate-fade-in absolute z-50 mt-2 flex max-h-[70vh] w-full flex-col gap-3 overflow-y-auto rounded-xl border border-border bg-surface p-2 shadow-lg">
              {sections.map((section) => (
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

      {/* -ml-16 trekt deze kolom over de paginarand van Beheer-pagina's heen
          (md:px-16 in AppShell voor "brede" pagina's), zodat hij vlak tegen
          de hoofd-Sidebar aan ligt i.p.v. er met een zichtbaar gaatje los
          van te staan. */}
      <nav className="hidden md:-ml-16 md:flex md:w-60 md:shrink-0 md:flex-col md:gap-5 md:border-r md:border-border md:px-4 md:py-1">
        {sections.map((section) => (
          <div key={section.title} className="flex flex-col gap-1">
            <p className="px-3 pb-1 text-xs font-semibold uppercase tracking-wide text-muted">{section.title}</p>
            {section.items.map((item) => renderItem(item))}
          </div>
        ))}
      </nav>
    </>
  );
}
