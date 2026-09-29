"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { clsx } from "clsx";
import { BEHEER_SECTIONS } from "./beheer-nav-items";

// Permanent zij-menu voor alle /beheer/*-pagina's (zie BeheerLayout) i.p.v.
// een los kaartjes-overzicht op /beheer zelf — je kunt nu vanaf elke
// beheerpagina direct naar een andere sectie, zonder eerst terug te
// klikken. Op mobiel een horizontaal scrollbare pillenrij (sectietitels
// verborgen, geen ruimte voor een volledig uitgeklapt menu boven de
// inhoud); op desktop een verticale kolom met sectiekoppen, net als de
// hoofdnavigatie (Sidebar.tsx).
export function BeheerSidebar() {
  const pathname = usePathname();

  function isActive(href: string) {
    if (href === "/beheer") return pathname === "/beheer";
    return pathname === href || pathname.startsWith(`${href}/`);
  }

  return (
    <nav className="-mx-4 flex gap-4 overflow-x-auto px-4 pb-2 md:mx-0 md:w-56 md:shrink-0 md:flex-col md:gap-5 md:overflow-visible md:px-0 md:pb-0">
      {BEHEER_SECTIONS.map((section) => (
        <div key={section.title} className="flex shrink-0 gap-1 md:flex-col">
          <p className="hidden px-3 pb-1 text-xs font-semibold uppercase tracking-wide text-muted md:block">
            {section.title}
          </p>
          {section.items.map((item) => {
            const active = isActive(item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={clsx(
                  "flex shrink-0 items-center gap-2 whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium transition-all duration-150",
                  active
                    ? "bg-voc-red-light text-voc-red"
                    : "text-foreground hover:bg-black/[.04] dark:hover:bg-white/[.06]"
                )}
              >
                <Icon size={16} strokeWidth={active ? 2.5 : 2} />
                {item.label}
              </Link>
            );
          })}
        </div>
      ))}
    </nav>
  );
}
