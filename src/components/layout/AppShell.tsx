import type { ReactNode } from "react";
import type { Profile } from "@/lib/auth/session";
import { Sidebar } from "./Sidebar";
import { BottomNav } from "./BottomNav";
import { MobileHeader } from "./MobileHeader";

export function AppShell({
  profile,
  unreadNotifications,
  children,
}: {
  profile: Profile;
  unreadNotifications: number;
  children: ReactNode;
}) {
  return (
    <div className="min-h-dvh bg-background">
      <Sidebar profile={profile} unreadNotifications={unreadNotifications} />
      <MobileHeader profile={profile} unreadNotifications={unreadNotifications} />
      <main className="pb-20 md:ml-64 md:pb-0">
        <div className="mx-auto w-full max-w-2xl px-4 py-6 md:max-w-5xl md:px-8 md:py-10">{children}</div>
      </main>
      <BottomNav />
    </div>
  );
}
