"use client";

import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { MoreVertical } from "lucide-react";
import { clsx } from "clsx";
import { useEscapeKey } from "@/lib/dom/useEscapeKey";
import { useFixedAnchor } from "@/lib/dom/useFixedAnchor";
import { FloatingPortal } from "@/components/ui/FloatingPortal";

export type ActionMenuItem = {
  label: string;
  onClick: () => void;
  danger?: boolean;
};

const MENU_WIDTH = 160;

// Rechtsboven drie puntjes op een bericht/reactie i.p.v. losse
// potlood/prullenbak-iconen — elke instantie heeft zijn eigen open-state
// (er kunnen tientallen tegelijk in de DOM staan, één per bericht/reactie,
// dus dit hoort niet bij de gedeelde OverlayContext die uitsluit tussen de
// vier nav-menu's).
export function ActionMenu({ items }: { items: ActionMenuItem[] }) {
  const [open, setOpen] = useState(false);
  const { anchorRef, rect } = useFixedAnchor<HTMLButtonElement>(open);
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([]);
  useEscapeKey(open, () => setOpen(false));

  // Menu opent altijd met het eerste item gefocust (WAI-ARIA menu-patroon) —
  // zonder dit blijft de focus op de drietjes-knop staan en werkt Pijl-omlaag
  // pas na een eerste, overbodige druk op Tab.
  useEffect(() => {
    if (open) itemRefs.current[0]?.focus();
  }, [open]);

  if (items.length === 0) return null;

  function moveFocus(nextIndex: number) {
    const index = (nextIndex + items.length) % items.length;
    itemRefs.current[index]?.focus();
  }

  function handleMenuKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    const currentIndex = itemRefs.current.findIndex((el) => el === document.activeElement);
    if (e.key === "ArrowDown") {
      e.preventDefault();
      moveFocus(currentIndex + 1);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      moveFocus(currentIndex - 1);
    } else if (e.key === "Home") {
      e.preventDefault();
      moveFocus(0);
    } else if (e.key === "End") {
      e.preventDefault();
      moveFocus(items.length - 1);
    }
  }

  return (
    <div className="relative">
      <button
        ref={anchorRef}
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label="Meer opties"
        aria-haspopup="true"
        aria-expanded={open}
        className="flex h-7 w-7 items-center justify-center rounded-full text-muted hover:bg-black/[.04] hover:text-foreground dark:hover:bg-white/[.08]"
      >
        <MoreVertical size={16} />
      </button>
      {/* Backdrop én menu samen in dezelfde portal (document.body) — alleen
          de backdrop portalen (zoals voorheen) liet het menu zelf nog
          absolute t.o.v. de trigger staan. Een voorouder met een always-on
          transform/animatie (zoals de kaart-entree-animatie, of
          RouteOverlayPanel bij berichten binnen een geopend profieloverlay)
          maakt zichzelf dan het containing block voor dat lokale menu, dat
          daardoor onder de wél-geportaalde backdrop kwam: klikken op een
          item sloot het menu via de backdrop i.p.v. de knop te raken — item
          leek niets te doen (zie het "kan niet verwijderen/bewerken"-bugrapport).
          Positie komt van useFixedAnchor (de knop zelf), zelfde patroon als
          andere losse popovers (zoeken, notificaties, accountmenu). */}
      {open && rect && (
        <FloatingPortal>
          <div className="fixed inset-0 z-30 cursor-pointer" onClick={() => setOpen(false)} />
          <div
            role="menu"
            aria-label="Meer opties"
            onKeyDown={handleMenuKeyDown}
            className="animate-scale-in origin-top-right fixed z-40 w-40 overflow-hidden rounded-xl border border-border bg-surface shadow-lg"
            style={{ top: rect.bottom + 4, left: rect.right - MENU_WIDTH }}
          >
            {items.map((item, index) => (
              <button
                key={item.label}
                ref={(el) => {
                  itemRefs.current[index] = el;
                }}
                type="button"
                role="menuitem"
                onClick={() => {
                  setOpen(false);
                  item.onClick();
                }}
                className={clsx(
                  "block w-full px-3 py-2 text-left text-sm hover:bg-black/[.04] dark:hover:bg-white/[.06]",
                  item.danger ? "text-voc-red-text" : "text-foreground"
                )}
              >
                {item.label}
              </button>
            ))}
          </div>
        </FloatingPortal>
      )}
    </div>
  );
}
