"use client";

import { useState } from "react";
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
  useEscapeKey(open, () => setOpen(false));

  if (items.length === 0) return null;

  return (
    <div className="relative">
      <button
        ref={anchorRef}
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label="Meer opties"
        className="flex h-7 w-7 items-center justify-center rounded-full text-muted hover:bg-black/[.04] hover:text-voc-red-text dark:hover:bg-white/[.08]"
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
            className="animate-scale-in origin-top-right fixed z-40 w-40 overflow-hidden rounded-xl border border-border bg-surface shadow-lg"
            style={{ top: rect.bottom + 4, left: rect.right - MENU_WIDTH }}
          >
            {items.map((item) => (
              <button
                key={item.label}
                type="button"
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
