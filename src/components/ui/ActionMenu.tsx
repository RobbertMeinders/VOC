"use client";

import { useState } from "react";
import { MoreVertical } from "lucide-react";
import { clsx } from "clsx";
import { useEscapeKey } from "@/lib/dom/useEscapeKey";
import { FloatingPortal } from "@/components/ui/FloatingPortal";

export type ActionMenuItem = {
  label: string;
  onClick: () => void;
  danger?: boolean;
};

// Rechtsboven drie puntjes op een bericht/reactie i.p.v. losse
// potlood/prullenbak-iconen — elke instantie heeft zijn eigen open-state
// (er kunnen tientallen tegelijk in de DOM staan, één per bericht/reactie,
// dus dit hoort niet bij de gedeelde OverlayContext die uitsluit tussen de
// vier nav-menu's).
export function ActionMenu({ items }: { items: ActionMenuItem[] }) {
  const [open, setOpen] = useState(false);
  useEscapeKey(open, () => setOpen(false));

  if (items.length === 0) return null;

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label="Meer opties"
        className="flex h-7 w-7 items-center justify-center rounded-full text-muted hover:bg-black/[.04] hover:text-voc-red dark:hover:bg-white/[.08]"
      >
        <MoreVertical size={16} />
      </button>
      {open && (
        <>
          {/* FloatingPortal: alleen deze onzichtbare klik-vanger, niet het menu
              zelf — een voorouder met een always-on transform (RouteOverlayPanel,
              bij berichten binnen een geopend profieloverlay) maakt zichzelf
              anders het containing block voor deze fixed inset-0-laag, waardoor
              klikken buiten dat paneel (bv. de sidebar) het menu niet meer
              sloten. Het menu zelf blijft gewoon absolute t.o.v. de trigger. */}
          <FloatingPortal>
            <div className="fixed inset-0 z-30 cursor-pointer" onClick={() => setOpen(false)} />
          </FloatingPortal>
          <div className="animate-scale-in origin-top absolute right-0 top-full z-40 mt-1 w-40 overflow-hidden rounded-xl border border-border bg-surface shadow-lg">
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
                  item.danger ? "text-voc-red" : "text-foreground"
                )}
              >
                {item.label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
