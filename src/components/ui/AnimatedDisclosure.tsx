"use client";

import { useState, type ReactNode } from "react";
import { ChevronDown } from "lucide-react";
import { clsx } from "clsx";

// Afwerkronde blok 5: vervangt een kale <details>/<summary> (open/dicht
// klappen zonder animatie) op plekken waar een hoogte-animatie gewenst is —
// de grid-template-rows 0fr->1fr-truc (zelfde als VerenigingMenu) is de
// enige CSS-only manier om een onbekende inhoudshoogte toch te animeren.
export function AnimatedDisclosure({
  label,
  contentClassName,
  defaultOpen = false,
  // Voor plekken waar het klapblok zelf de link-achtige call-to-action is
  // (bv. "Zo krijg je meldingen op je telefoon") i.p.v. een neutrale
  // sectiekop — petrol/accentkleur op tekst én pijltje i.p.v. de standaard
  // gedempte tint, zodat zichtbaar is dat de regel klikbaar is.
  accent = false,
  children,
}: {
  label: ReactNode;
  contentClassName?: string;
  defaultOpen?: boolean;
  accent?: boolean;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className={clsx("flex items-center gap-1.5 text-sm font-semibold", accent ? "text-petrol" : "text-muted")}
      >
        <ChevronDown size={16} className={clsx("transition-transform duration-200", open && "rotate-180")} />
        {label}
      </button>
      <div
        className="grid transition-[grid-template-rows] duration-200 ease-out motion-reduce:transition-none"
        style={{ gridTemplateRows: open ? "1fr" : "0fr" }}
      >
        <div className="overflow-hidden">
          <div className={clsx("mt-3", contentClassName)}>{children}</div>
        </div>
      </div>
    </div>
  );
}
