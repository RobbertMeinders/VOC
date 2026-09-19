"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell } from "lucide-react";
import { clsx } from "clsx";
import { useUnreadNotificationCount } from "@/lib/notifications/useUnreadCount";

export function NotificationBellLink({
  profileId,
  initialUnreadCount,
}: {
  profileId: string;
  initialUnreadCount: number;
}) {
  const pathname = usePathname();
  const count = useUnreadNotificationCount(profileId, initialUnreadCount);
  const active = pathname.startsWith("/notificaties");

  return (
    <Link
      href="/notificaties"
      className={clsx(
        "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
        active ? "bg-voc-red-light text-voc-red" : "text-foreground hover:bg-black/[.04] dark:hover:bg-white/[.06]"
      )}
    >
      <Bell size={20} strokeWidth={active ? 2.5 : 2} />
      Notificaties
      {count > 0 && (
        <span className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-voc-red px-1.5 text-xs font-medium text-white">
          {count > 9 ? "9+" : count}
        </span>
      )}
    </Link>
  );
}
