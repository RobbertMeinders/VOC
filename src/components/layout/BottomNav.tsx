"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { clsx } from "clsx";
import { PRIMARY_NAV_ITEMS } from "./nav-items";
import { BottomNavProfileMenu } from "./ProfileMenu";
import type { Profile } from "@/lib/auth/session";

export function BottomNav({
  profile,
  avatarUrl,
  companyId,
}: {
  profile: Profile;
  avatarUrl: string | null;
  companyId: string | null;
}) {
  const pathname = usePathname();

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-surface/95 backdrop-blur pb-[env(safe-area-inset-bottom)] md:hidden"
      aria-label="Hoofdnavigatie"
    >
      <ul className="flex items-stretch justify-around">
        {PRIMARY_NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
          return (
            <li key={href} className="flex-1">
              <Link
                href={href}
                className={clsx(
                  "flex h-14 flex-col items-center justify-center gap-0.5 text-xs font-medium",
                  active ? "text-voc-red" : "text-muted"
                )}
              >
                <Icon size={22} strokeWidth={active ? 2.5 : 2} />
                {label}
              </Link>
            </li>
          );
        })}
        <li className="flex-1">
          <BottomNavProfileMenu profile={profile} avatarUrl={avatarUrl} companyId={companyId} />
        </li>
      </ul>
    </nav>
  );
}
