"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown, FileText, Handshake, Info, Newspaper, UserCheck, UsersRound, type LucideIcon } from "lucide-react";
import { clsx } from "clsx";
import { useOverlay } from "@/lib/ui/OverlayContext";

// Nieuws bovenaan (op gebruikersverzoek): meest actuele/bekeken link van
// deze groep, hoort als eerste in beeld i.p.v. onderaan.
const LINKS: { href: string; label: string; icon: LucideIcon }[] = [
  { href: "/nieuws", label: "Nieuws", icon: Newspaper },
  { href: "/vereniging/over-ons", label: "Over de VOC", icon: Info },
  { href: "/vereniging/bestuur", label: "Bestuur", icon: UserCheck },
  { href: "/vereniging/commissies", label: "Commissies", icon: UsersRound },
  { href: "/documenten", label: "Documenten", icon: FileText },
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
        // Stijlronde "zelfde indeling, nieuwe stijl": zelfde patroon als
        // Sidebar.tsx — gevuld vlak + rood streepje bínnen het vlak i.p.v.
        // een linkerrand.
        className={clsx(
          "relative flex w-full items-center gap-3 rounded-lg py-2.5 pl-3 pr-3 text-sm transition-colors",
          active || open
            ? "bg-raised font-semibold text-foreground"
            : "font-medium text-foreground hover:bg-black/[.04] dark:hover:bg-white/[.06]"
        )}
      >
        {(active || open) && <span aria-hidden className="absolute inset-y-1.5 left-1 w-[3px] rounded-full bg-voc-red" />}
        <Handshake size={20} strokeWidth={active ? 2.5 : 2} className={active || open ? "text-foreground" : "text-muted"} />
        Vereniging
        <ChevronDown size={16} className={clsx("ml-auto transition-transform duration-150", open && "rotate-180")} />
      </button>
      {/* Afwerkronde blok 5: hoogte-animatie i.p.v. direct in/uit poppen —
          grid-template-rows 0fr->1fr is de enige CSS-only manier om een
          onbekende hoogte (afhankelijk van het aantal links) toch te
          animeren, zonder een vaste max-height te moeten gokken. */}
      <div
        className="grid transition-[grid-template-rows] duration-200 ease-out motion-reduce:transition-none"
        style={{ gridTemplateRows: open ? "1fr" : "0fr" }}
      >
        <div className="overflow-hidden">
          <div className="flex flex-col gap-1 pt-1">
            {LINKS.map(({ href, label, icon: Icon }) => {
              const linkActive = pathname.startsWith(href);
              return (
                <Link
                  key={href}
                  href={href}
                  onClick={close}
                  tabIndex={open ? undefined : -1}
                  className={clsx(
                    "relative flex items-center gap-3 rounded-lg py-2.5 pl-[34px] pr-3 text-sm transition-colors",
                    linkActive
                      ? "bg-raised font-semibold text-foreground"
                      : "font-medium text-foreground hover:bg-black/[.04] dark:hover:bg-white/[.06]"
                  )}
                >
                  {linkActive && <span aria-hidden className="absolute inset-y-1.5 left-1 w-[3px] rounded-full bg-voc-red" />}
                  <Icon size={16} strokeWidth={linkActive ? 2.5 : 2} className={linkActive ? "text-foreground" : "text-muted"} />
                  {label}
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
