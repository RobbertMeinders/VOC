"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Building2, ChevronUp, Users } from "lucide-react";
import { clsx } from "clsx";

const OPTIONS = [
  { href: "/bedrijven", label: "Bedrijven", icon: Building2 },
  { href: "/leden", label: "Leden", icon: Users },
];

// Mobiel: Netwerk tikken navigeert niet direct, maar toont eerst een
// duidelijke keuze (Bedrijven | Leden) — dezelfde open/sluit-interactie als
// het accountmenu (ProfileMenu.tsx).
export function NetworkChooser({ badgeCount }: { badgeCount: number }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const active = pathname.startsWith("/leden") || pathname.startsWith("/bedrijven");

  return (
    <div className="relative flex-1">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
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

      {open && (
        <>
          <div className="fixed inset-0 z-20" onClick={() => setOpen(false)} />
          <div className="absolute bottom-full left-1/2 z-30 mb-2 w-44 -translate-x-1/2 overflow-hidden rounded-xl border border-border bg-surface shadow-lg">
            <p className="flex items-center gap-1.5 border-b border-border px-3 py-2 text-xs font-semibold text-muted">
              <ChevronUp size={12} />
              Netwerk
            </p>
            {OPTIONS.map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                onClick={() => setOpen(false)}
                className="flex items-center gap-3 px-3 py-2.5 text-sm text-foreground hover:bg-black/[.04] dark:hover:bg-white/[.06]"
              >
                <Icon size={16} />
                {label}
              </Link>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

