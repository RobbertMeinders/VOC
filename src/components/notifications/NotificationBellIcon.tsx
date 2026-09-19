"use client";

import Link from "next/link";
import { Bell } from "lucide-react";
import { useUnreadNotificationCount } from "@/lib/notifications/useUnreadCount";

export function NotificationBellIcon({
  profileId,
  initialUnreadCount,
}: {
  profileId: string;
  initialUnreadCount: number;
}) {
  const count = useUnreadNotificationCount(profileId, initialUnreadCount);

  return (
    <Link
      href="/notificaties"
      aria-label="Notificaties"
      className="relative flex h-9 w-9 items-center justify-center rounded-full text-foreground hover:bg-black/[.04] dark:hover:bg-white/[.08]"
    >
      <Bell size={20} />
      {count > 0 && (
        <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-voc-red px-1 text-[10px] font-medium text-white">
          {count > 9 ? "9+" : count}
        </span>
      )}
    </Link>
  );
}
