"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown, FileText, Handshake, Info, Newspaper, UserCheck, UsersRound, type LucideIcon } from "lucide-react";
import { clsx } from "clsx";
import { useOverlay } from "@/lib/ui/OverlayContext";

const LINKS: { href: string; label: string; icon: LucideIcon }[] = [
  { href: "/vereniging/over-ons", label: "Over de VOC", icon: Info },
  { href: "/vereniging/bestuur", label: "Bestuur", icon: UserCheck },
  { href: "/vereniging/commissies", label: "Commissies", icon: UsersRound },
  { href: "/documenten", label: "Documenten", icon: FileText },
  { href: "/nieuws", label: "Nieuws", icon: Newspaper },
];

// Vervangt het losse "Documenten"-item in de hoofdnavigatie (VOC Hub —
// Beheeromgeving-opdracht, punt over toegang voor leden): een inline
// uitklap-dropdown vanuit de sidebar-rij. Documenten zelf blijft als route
// en functionaliteit ongewijzigd, alleen de ingang ernaartoe verhuist
// hierheen. Alleen nog desktop/sidebar: het mobiele, schermvullende paneel
// achter de hamburgerknop is verhuisd naar HamburgerMenu (eigen "Menu",
// met naast deze verenigingslinks ook "Snel naar" en instellingen/privacy).
export function VerenigingMenu() {
  const { open, toggle, close } = useOverlay("vereniging");
  const pathname = usePathname();

  const active = pathname.startsWith("/vereniging") || pathname.startsWith("/documenten") || pathname.startsWith("/nieuws");

  return (
    // Echte inline accordion i.p.v. een FloatingPortal-dropdown: de
    // submenu-links staan gewoon in de normale documentstroom van de
    // sidebar en duwen de accountrij eronder omlaag bij het openen — geen
    // overlay/kaart die los boven de rest zweeft.
    <div>
      <button
        type="button"
        onClick={toggle}
        aria-expanded={open}
        className={clsx(
          "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-150",
          active || open
            ? "bg-voc-red-light text-voc-red-text"
            : "text-foreground hover:translate-x-0.5 hover:bg-black/[.04] dark:hover:bg-white/[.06]"
        )}
      >
        <Handshake size={20} strokeWidth={active ? 2.5 : 2} />
        Vereniging
        <ChevronDown size={16} className={clsx("ml-auto transition-transform duration-150", open && "rotate-180")} />
      </button>
      {open && (
        <div className="flex flex-col gap-1 pt-1">
          {LINKS.map(({ href, label, icon: Icon }) => {
            const linkActive = pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                onClick={close}
                className={clsx(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 pl-10 text-sm font-medium transition-all duration-150",
                  linkActive
                    ? "bg-voc-red-light text-voc-red-text"
                    : "text-foreground hover:translate-x-0.5 hover:bg-black/[.04] dark:hover:bg-white/[.06]"
                )}
              >
                <Icon size={16} strokeWidth={linkActive ? 2.5 : 2} />
                {label}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
