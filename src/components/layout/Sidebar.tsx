"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { clsx } from "clsx";
import { Building2, LayoutDashboard, Settings, User as UserIcon, type LucideIcon } from "lucide-react";
import { DESKTOP_NAV_ITEMS, isNavItemActive, type NavItem } from "./nav-items";
import { NavBadge } from "./NavBadge";
import { Logo } from "@/components/ui/Logo";
import { SidebarProfileMenu } from "./ProfileMenu";
import { VersionLine } from "./VersionLine";
import { VerenigingMenu } from "./VerenigingMenu";
import { NotificationCenter } from "@/components/notifications/NotificationCenter";
import { SearchOverlay } from "@/components/search/SearchOverlay";
import { VocSocialLinks } from "@/components/ui/VocSocialLinks";
import { isBoard } from "@/lib/auth/roles";
import { memberHref } from "@/lib/members/slug";
import type { Profile } from "@/lib/auth/session";
import type { UnreadNotificationSections } from "@/lib/notifications/useUnreadCount";

export function Sidebar({
  profile,
  unread,
  avatarUrl,
  companyId,
  companyName,
  logoUrl,
  siteName,
  showTestfase,
  beheerWaitingCount,
}: {
  profile: Profile;
  unread: UnreadNotificationSections;
  avatarUrl: string | null;
  companyId: string | null;
  companyName: string | null;
  logoUrl: string | null;
  siteName: string;
  showTestfase: boolean;
  beheerWaitingCount: number;
}) {
  const pathname = usePathname();

  function renderItem(item: NavItem, indented = false) {
    const { href, label, icon: Icon, badgeKey, badgeLabel } = item;
    const active = isNavItemActive(item, pathname, { ownProfileSlug: profile.slug, ownCompanyId: companyId });
    return (
      <Link
        key={href}
        href={href}
        // Stijlronde "zelfde indeling, nieuwe stijl": actief item is een
        // gevuld vlak (bg-raised) met een rood streepje bínnen het vlak
        // i.p.v. een linkerrand die het item zelf naar rechts duwt — geen
        // volle rand meer op inactieve items.
        className={clsx(
          "relative flex items-center gap-3 rounded-lg py-2.5 pr-3 text-sm transition-colors",
          indented ? "pl-[34px]" : "pl-3",
          active
            ? "bg-raised font-semibold text-foreground"
            : "font-medium text-foreground hover:bg-black/[.04] dark:hover:bg-white/[.06]"
        )}
      >
        {active && <span aria-hidden className="absolute inset-y-1.5 left-1 w-[3px] rounded-full bg-voc-red" />}
        <Icon size={indented ? 16 : 20} strokeWidth={active ? 2.5 : 2} className={active ? "text-foreground" : "text-muted"} />
        {label}
        {badgeKey && (
          <span className="ml-auto">
            <NavBadge count={unread[badgeKey]} label={badgeLabel ? `${unread[badgeKey]} ${badgeLabel}` : undefined} />
          </span>
        )}
      </Link>
    );
  }

  // Mijn profiel/Mijn bedrijfsprofiel/Instellingen/Beheer staan op desktop
  // altijd zichtbaar i.p.v. achter het klikken op de profielfoto — die knop
  // opent alleen nog Uitloggen (SidebarProfileMenu).
  const accountItems: { href: string; label: string; icon: LucideIcon; badge?: number }[] = [
    { href: memberHref(profile), label: "Mijn profiel", icon: UserIcon },
    ...(companyId ? [{ href: `/bedrijven/${companyId}`, label: "Mijn bedrijf", icon: Building2 }] : []),
    { href: "/instellingen", label: "Instellingen", icon: Settings },
    ...(isBoard(profile.role) ? [{ href: "/beheer", label: "Beheer", icon: LayoutDashboard, badge: beheerWaitingCount }] : []),
  ];

  function renderAccountItem({ href, label, icon: Icon, badge }: (typeof accountItems)[number]) {
    const active = pathname === href || (href !== "/instellingen" && pathname.startsWith(href));
    return (
      <Link
        key={href}
        href={href}
        className={clsx(
          "relative flex items-center gap-3 rounded-lg py-2.5 pl-3 pr-3 text-sm transition-colors",
          active
            ? "bg-raised font-semibold text-foreground"
            : "font-medium text-foreground hover:bg-black/[.04] dark:hover:bg-white/[.06]"
        )}
      >
        {active && <span aria-hidden className="absolute inset-y-1.5 left-1 w-[3px] rounded-full bg-voc-red" />}
        <Icon size={20} strokeWidth={active ? 2.5 : 2} className={active ? "text-foreground" : "text-muted"} />
        {label}
        {Boolean(badge) && (
          <span className="ml-auto">
            <NavBadge count={badge!} label={`${badge} item(s) wachten op jou in beheer`} />
          </span>
        )}
      </Link>
    );
  }

  return (
    <aside className="fixed inset-y-0 left-0 hidden h-dvh w-72 flex-col border-r border-border bg-surface px-4 py-6 md:flex">
      <div className="mb-8 flex items-center justify-between gap-2 px-2">
        <Logo logoUrl={logoUrl} siteName={siteName} />
        <div className="flex shrink-0 items-center gap-0.5">
          <SearchOverlay variant="sidebar" />
          {/* Popover i.p.v. directe navigatie: een snelle blik zonder de
              huidige pagina te verlaten (/notificaties blijft gewoon
              bereikbaar via "Alles bekijken" in het paneel). Naast Zoeken
              i.p.v. een eigen rij in het menu: allebei een klein
              popover-icoontje, geen echte navigatiebestemming. De sidebar
              is w-72 (i.p.v. het eerdere w-64) juist om deze rij naast het
              volledige "Ledenportaal"-logo te laten passen, zonder
              afknippen of een aparte icoontjes-rij eronder — beide eerdere
              probeersels oogden niet lekker. */}
          <NotificationCenter count={unread.total} variant="sidebar" />
        </div>
      </div>

      <nav className="flex flex-1 flex-col gap-1">
        {DESKTOP_NAV_ITEMS.map((item) => renderItem(item))}
        <VerenigingMenu />
      </nav>

      {/* Scheidingslijnen ingesprongen (±10px marge) i.p.v. over de volle
          breedte — op een los div i.p.v. border-t op het inhoud-element
          zelf, zodat de marge niet ook de inhoud erboven/eronder raakt. */}
      <div className="mx-[10px] mt-2 border-t border-border" />
      <nav className="flex flex-col gap-1 pt-2">{accountItems.map(renderAccountItem)}</nav>

      <div className="mx-[10px] border-t border-border" />
      <VersionLine showTestfase={showTestfase} variant="sidebar" />
      <div className="pt-2">
        <SidebarProfileMenu profile={profile} avatarUrl={avatarUrl} companyName={companyName} />
      </div>

      {/* Onder de profielfoto zelf i.p.v. ertussenin ergens los te staan. */}
      <div className="flex items-center justify-center gap-2 pt-3">
        <VocSocialLinks />
      </div>
    </aside>
  );
}
