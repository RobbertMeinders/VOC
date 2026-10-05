"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Building2, ChevronDown, ChevronUp, Users } from "lucide-react";
import { clsx } from "clsx";
import { NavBadge } from "./NavBadge";
import { FloatingPortal } from "@/components/ui/FloatingPortal";
import { useEscapeKey } from "@/lib/dom/useEscapeKey";
import { useFixedAnchor } from "@/lib/dom/useFixedAnchor";
import { useOverlay } from "@/lib/ui/OverlayContext";

const PANEL_WIDTH = 192; // w-48
const EDGE_MARGIN = 16;

const OPTIONS = [
  { href: "/leden", label: "Leden", icon: Users },
  { href: "/bedrijven", label: "Bedrijven", icon: Building2 },
];

// Netwerk tikken/klikken navigeert niet direct, maar toont eerst een
// duidelijke keuze (Bedrijven | Leden) — dezelfde open/sluit-interactie als
// het accountmenu (ProfileMenu.tsx). Op mobiel een bottom-sheet-achtige
// popover boven de bottom nav, op desktop een dropdown net als het
// accountmenu in de sidebar.
export function NetworkChooser({
  badgeCount,
  variant = "mobile",
}: {
  badgeCount: number;
  variant?: "mobile" | "sidebar";
}) {
  const { open, toggle, close } = useOverlay("netwerk");
  const pathname = usePathname();
  const active = pathname.startsWith("/leden") || pathname.startsWith("/bedrijven");
  // Alleen op mobiel is dit nog een los gepositioneerd paneel (zie
  // useFixedAnchor hieronder) — de sidebar-variant klapt inline open, dus
  // heeft geen anker-rect nodig.
  const { anchorRef, rect } = useFixedAnchor<HTMLButtonElement>(variant === "mobile" && open);

  useEscapeKey(open, close);

  if (variant === "sidebar") {
    // Klapt Bedrijven/Leden als submenu open direct onder Netwerk, binnen de
    // gewone flex-col van de sidebar — dus geen popover die overheen valt,
    // maar Documenten/Notificaties eronder schuiven gewoon mee naar beneden,
    // net als een mapje dat je openklapt.
    return (
      <div>
        <button
          type="button"
          onClick={toggle}
          aria-expanded={open}
          className={clsx(
            "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
            active || open
              ? "bg-voc-red-light text-voc-red"
              : "text-foreground hover:bg-black/[.04] dark:hover:bg-white/[.06]"
          )}
        >
          <Users size={20} strokeWidth={active ? 2.5 : 2} />
          Netwerk
          <span className="ml-auto flex items-center gap-1.5">
            {badgeCount > 0 && <NavBadge count={badgeCount} />}
            <ChevronDown size={16} className={clsx("transition-transform duration-200", open && "rotate-180")} />
          </span>
        </button>
        {open && (
          <div className="animate-fade-in mt-1 flex flex-col gap-1">
            {OPTIONS.map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                className={clsx(
                  "flex items-center gap-3 rounded-lg py-2.5 pl-10 pr-3 text-sm font-medium transition-all duration-150",
                  pathname.startsWith(href)
                    ? "bg-voc-red-light text-voc-red"
                    : "text-foreground hover:translate-x-0.5 hover:bg-black/[.04] dark:hover:bg-white/[.06]"
                )}
              >
                <Icon size={16} />
                {label}
              </Link>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="relative flex-1">
      <button
        ref={anchorRef}
        type="button"
        onClick={toggle}
        className={clsx(
          "relative flex h-14 w-full flex-col items-center justify-center gap-0.5 text-xs font-medium",
          active ? "text-voc-red" : "text-muted"
        )}
      >
        <span className="relative">
          <Users size={22} strokeWidth={active ? 2.5 : 2} />
          {badgeCount > 0 && (
            <span className="absolute -right-1.5 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-voc-red px-1 text-[10px] font-medium text-white">
              {badgeCount > 9 ? "9+" : badgeCount}
            </span>
          )}
        </span>
        Netwerk
      </button>

      {/* FloatingPortal: BottomNav (de voorouder hier) heeft backdrop-blur,
          wat een position:fixed kind zonder portal in BottomNav's eigen
          stacking context "vangt" — zonder dit kon dit paneel achter een
          open overlay uitkomen i.p.v. er overheen (zie NotificationCenter).
          md:hidden staat hier expliciet op, want portalen haalt dit paneel
          los van BottomNav's eigen md:hidden. Positie komt van
          useFixedAnchor (de knop zelf), i.p.v. los in het midden van het
          scherm — dat laatste is niet waar de knop staat. */}
      {open && rect && (
        <FloatingPortal>
          <div className="fixed inset-0 z-40 cursor-pointer md:hidden" onClick={close} />
          <div
            className="fixed z-50 w-48 md:hidden"
            style={{
              left: Math.min(
                Math.max(rect.left + rect.width / 2, EDGE_MARGIN + PANEL_WIDTH / 2),
                window.innerWidth - EDGE_MARGIN - PANEL_WIDTH / 2
              ),
              bottom: window.innerHeight - rect.top + 8,
              transform: "translateX(-50%)",
            }}
          >
            <div className="animate-scale-in origin-bottom overflow-hidden rounded-xl border border-border bg-surface shadow-lg">
              <p className="flex items-center gap-1.5 border-b border-border px-3 py-2 text-xs font-semibold text-muted">
                <ChevronUp size={12} />
                Netwerk
              </p>
              {OPTIONS.map(({ href, label, icon: Icon }) => (
                <Link
                  key={href}
                  href={href}
                  onClick={close}
                  className="flex items-center gap-3 px-4 py-3.5 text-sm text-foreground hover:bg-black/[.04] dark:hover:bg-white/[.06]"
                >
                  <Icon size={20} />
                  {label}
                </Link>
              ))}
            </div>
          </div>
        </FloatingPortal>
      )}
    </div>
  );
}
