"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { FileText, IdCard, Info, Menu, UsersRound, X, type LucideIcon } from "lucide-react";
import { clsx } from "clsx";
import { FloatingPortal } from "@/components/ui/FloatingPortal";
import { useEscapeKey } from "@/lib/dom/useEscapeKey";
import { useBodyScrollLock } from "@/lib/dom/useBodyScrollLock";
import { useFixedAnchor } from "@/lib/dom/useFixedAnchor";
import { useOverlay } from "@/lib/ui/OverlayContext";

const LINKS: { href: string; label: string; icon: LucideIcon }[] = [
  { href: "/vereniging/over-ons", label: "Over de vereniging", icon: Info },
  { href: "/vereniging/bestuur", label: "Bestuur", icon: IdCard },
  { href: "/vereniging/commissies", label: "Commissies", icon: UsersRound },
  { href: "/documenten", label: "Documenten", icon: FileText },
];

// Vervangt het losse "Documenten"-item in de hoofdnavigatie (VOC Hub —
// Beheeromgeving-opdracht, punt over toegang voor leden): op desktop een
// dropdown vanuit de sidebar-rij, op mobiel een paginavullend paneel vanuit
// een hamburgerknop in MobileHeader — zelfde desktop/mobiel-opzet als
// NotificationCenter. Documenten zelf blijft als route en functionaliteit
// ongewijzigd, alleen de ingang ernaartoe verhuist hierheen.
export function VerenigingMenu({ variant }: { variant: "sidebar" | "mobile" }) {
  const { open, toggle, close } = useOverlay("vereniging");
  const pathname = usePathname();
  const { anchorRef, rect } = useFixedAnchor<HTMLButtonElement>(variant === "sidebar" && open);

  // Alleen voor de mobiele variant: sluiten speelt eerst de omgekeerde
  // schuifanimatie af (animate-slide-out-right) en unmount daarna pas —
  // zelfde "closing"-opzet als MobileProfileMenu, zodat teruggaan vanuit dit
  // paginavullende paneel net zo vloeiend aanvoelt als het openen.
  const [closing, setClosing] = useState(false);
  function requestClose() {
    setClosing(true);
  }
  function handleExitComplete() {
    setClosing(false);
    close();
  }

  useEscapeKey(open && !closing, variant === "mobile" ? requestClose : close);
  useBodyScrollLock(variant === "mobile" && (open || closing));

  const active = pathname.startsWith("/vereniging") || pathname.startsWith("/documenten");

  const links = (
    <>
      {LINKS.map(({ href, label, icon: Icon }) => {
        const linkActive = pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            onClick={close}
            className={clsx(
              "flex items-center gap-3 px-4 py-3 text-sm font-medium",
              linkActive ? "bg-voc-red-light text-voc-red-text" : "text-foreground hover:bg-black/[.04] dark:hover:bg-white/[.06]"
            )}
          >
            <Icon size={18} />
            {label}
          </Link>
        );
      })}
    </>
  );

  if (variant === "mobile") {
    return (
      <>
        <button
          type="button"
          onClick={toggle}
          aria-label="Vereniging"
          className={clsx(
            "flex h-9 w-9 items-center justify-center rounded-full text-foreground hover:bg-black/[.04] dark:hover:bg-white/[.08]",
            (active || open) && "bg-voc-red-light text-voc-red-text"
          )}
        >
          <Menu size={20} />
        </button>
        {/* Zelfde FloatingPortal-redenering als NotificationCenter's mobiele
            paneel: MobileHeader heeft backdrop-blur, dat vangt een
            position:fixed kind anders in zijn eigen, lagere stacking context. */}
        {(open || closing) && (
          <FloatingPortal>
            <div
              className={clsx(
                "fixed inset-x-0 bottom-0 top-14 z-50 flex flex-col overflow-y-auto bg-surface pb-[env(safe-area-inset-bottom)] md:hidden",
                closing ? "animate-slide-out-right" : "animate-slide-in-right"
              )}
              onAnimationEnd={() => {
                if (closing) handleExitComplete();
              }}
            >
              <div className="flex items-center justify-between border-b border-border px-4 py-3">
                <p className="text-sm font-semibold text-foreground">Vereniging</p>
                <button
                  type="button"
                  onClick={requestClose}
                  aria-label="Sluiten"
                  className="flex h-7 w-7 items-center justify-center rounded-full text-muted hover:bg-black/[.04] hover:text-voc-red-text dark:hover:bg-white/[.08]"
                >
                  <X size={16} />
                </button>
              </div>
              <div className="flex flex-col py-1">{links}</div>
            </div>
          </FloatingPortal>
        )}
      </>
    );
  }

  return (
    <>
      <button
        ref={anchorRef}
        type="button"
        onClick={toggle}
        className={clsx(
          "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-150",
          active || open
            ? "bg-voc-red-light text-voc-red-text"
            : "text-foreground hover:translate-x-0.5 hover:bg-black/[.04] dark:hover:bg-white/[.06]"
        )}
      >
        <Info size={20} strokeWidth={active ? 2.5 : 2} />
        Vereniging
      </button>
      {open && rect && (
        <FloatingPortal>
          <div className="fixed inset-0 z-40 cursor-pointer" onClick={close} />
          <div
            className="animate-scale-in origin-top fixed z-50 w-64 overflow-hidden rounded-xl border border-border bg-surface py-1 shadow-lg"
            style={{ left: rect.left, top: rect.bottom + 4 }}
          >
            {links}
          </div>
        </FloatingPortal>
      )}
    </>
  );
}
