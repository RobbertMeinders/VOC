"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { clsx } from "clsx";
import { ArrowLeft, ChevronDown } from "lucide-react";
import { useEscapeKey } from "@/lib/dom/useEscapeKey";
import { NavBadge } from "@/components/layout/NavBadge";
import { BEHEER_SECTIONS, type BeheerNavItem } from "./beheer-nav-items";

// Permanent zij-menu voor alle /beheer/*-pagina's (zie BeheerLayout) i.p.v.
// een los kaartjes-overzicht op /beheer zelf. Op desktop een altijd
// zichtbare verticale kolom, direct naast de hoofdnavigatie. Op mobiel bleek
// een horizontaal scrollbare pillenrij met veel items over meerdere secties
// onhandig (geen sectiekoppen zichtbaar, veel heen-en-weer scrollen om iets
// te vinden) — daarom daar in plaats daarvan een knop met de huidige
// sectie die de volledige, gegroepeerde lijst inline uitklapt.
export function BeheerSidebar({
  isAdmin,
  badges = {},
}: {
  isAdmin: boolean;
  // Per href het aantal openstaande items (zelfde tellingen als "Wacht op
  // jou" op het dashboard, zie lib/beheer/waitingCounts.ts) — alleen items
  // die hier een sleutel in hebben tonen een badge.
  badges?: Record<string, number>;
}) {
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

  // Mobiele flyout (hieronder) blijft het gewone lichte lijst-item — die
  // overlay staat los boven de pagina, geen eigen "zone" zoals de donkere
  // desktop-zijbalk hieronder.
  function renderMobileItem(item: BeheerNavItem, onNavigate?: () => void) {
    const active = isActive(item.href);
    const Icon = item.icon;
    const badge = badges[item.href];
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
        {Boolean(badge) && (
          <span className="ml-auto">
            <NavBadge count={badge!} label={`${badge} item(s) wachten op jou`} />
          </span>
        )}
      </Link>
    );
  }

  // Redesign-besluit 8: donkerpetrol beheerzijbalk — actief item krijgt een
  // rood streepje links (border-left i.p.v. absolute positionering, zodat
  // het nergens buiten de eigen rij uitsteekt) i.p.v. de gevulde rode pil
  // die de gewone navigatie gebruikt.
  function renderDesktopItem(item: BeheerNavItem) {
    const active = isActive(item.href);
    const Icon = item.icon;
    const badge = badges[item.href];
    return (
      <Link
        key={item.href}
        href={item.href}
        className={clsx(
          "flex items-center gap-2 whitespace-nowrap rounded-r-lg border-l-[3px] py-2 pl-3 pr-3 text-sm font-medium transition-all duration-150",
          active ? "border-l-voc-red bg-white/10 text-white" : "border-l-transparent text-white/70 hover:bg-white/5 hover:text-white"
        )}
      >
        <Icon size={16} strokeWidth={active ? 2.5 : 2} />
        {item.label}
        {Boolean(badge) && (
          <span className="ml-auto">
            <NavBadge count={badge!} label={`${badge} item(s) wachten op jou`} />
          </span>
        )}
      </Link>
    );
  }

  return (
    <>
      {/* sticky zodat je tussen secties kunt wisselen zonder eerst terug naar
          boven te scrollen in een lange lijst (-mx-4/px-4 laat de achtergrond
          vol breed doorlopen, zelfde bleed-truc als elders). */}
      <div className="sticky top-14 z-20 -mx-4 bg-background px-4 pb-2 pt-2 md:hidden">
        <div className="relative">
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
                      {section.items.map((item) => renderMobileItem(item, () => setOpen(false)))}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* QA-feedback redesign: vervangt op desktop de gewone Sidebar (zie
          AppShell, wide-tak) i.p.v. ernaast te staan — zelfde fixed/w-72-
          geometrie als Sidebar.tsx, zodat main's md:ml-72 in AppShell voor
          beide varianten klopt. overflow-y-auto: deze lijst is langer dan
          de gewone navigatie en moet zelf kunnen scrollen zonder de vaste
          hoogte van de kolom te verliezen. Redesign-besluit 8: donkerpetrol
          vlak i.p.v. een gewone lichte kolom — zodat je in Beheer altijd
          meteen ziet dat je niet meer in het ledenportaal zelf zit. */}
      {/* h-dvh naast inset-y-0: zonder expliciete hoogte liet dit vlak op het
          live portaal halverwege de pagina los van de onderkant van het
          scherm, waarna de lichte --background erachter zichtbaar werd —
          zelfde combinatie als de gewone Sidebar (Sidebar.tsx) hierboven,
          die dit probleem niet had. */}
      <nav
        className="fixed inset-y-0 left-0 hidden h-dvh w-72 flex-col gap-5 overflow-y-auto px-3 py-6 md:flex"
        style={{ backgroundImage: "var(--hero-gradient)" }}
      >
        <Link
          href="/"
          className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-white/70 transition-colors hover:bg-white/5 hover:text-white"
        >
          <ArrowLeft size={16} />
          Terug naar portaal
        </Link>
        {sections.map((section) => (
          <div key={section.title} className="flex flex-col gap-1">
            <p className="px-3 pb-1 text-xs font-semibold uppercase tracking-wide text-white/40">{section.title}</p>
            {section.items.map((item) => renderDesktopItem(item))}
          </div>
        ))}
      </nav>
    </>
  );
}
