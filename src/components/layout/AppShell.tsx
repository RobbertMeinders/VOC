"use client";

import type { ReactNode } from "react";
import type { Profile } from "@/lib/auth/session";
import { useUnreadNotificationCount } from "@/lib/notifications/useUnreadCount";
import { Sidebar } from "./Sidebar";
import { BottomNav } from "./BottomNav";
import { MobileHeader } from "./MobileHeader";

export function AppShell({
  profile,
  unreadNotifications,
  avatarUrl,
  children,
}: {
  profile: Profile;
  unreadNotifications: number;
  avatarUrl: string | null;
  children: ReactNode;
}) {
  // Eén realtime-subscription hier, en het aantal als prop doorgeven aan de
  // sidebar- en mobiele-header-bel: allebei staan ze altijd in de DOM (alleen
  // via CSS verborgen), dus elk zijn eigen subscription zou een tweede
  // .on()-aanroep doen op hetzelfde, al ge-subscribede Supabase-kanaal.
  const unreadCount = useUnreadNotificationCount(profile.id, unreadNotifications);

  return (
    <div className="min-h-dvh bg-background">
      <Sidebar profile={profile} unreadCount={unreadCount} avatarUrl={avatarUrl} />
      <MobileHeader profile={profile} unreadCount={unreadCount} />
      <main className="pb-20 md:ml-64 md:pb-0">
        <div className="mx-auto w-full max-w-2xl px-4 py-6 md:max-w-6xl md:px-8 md:py-10">{children}</div>
      </main>
      <BottomNav />
    </div>
  );
}
