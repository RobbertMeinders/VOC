"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Bell, X } from "lucide-react";
import { clsx } from "clsx";
import { formatActivityDateShort } from "@/lib/format/date";
import { NavBadge } from "@/components/layout/NavBadge";
import { Skeleton } from "@/components/ui/Skeleton";
import { useEscapeKey } from "@/lib/dom/useEscapeKey";
import { useOverlay } from "@/lib/ui/OverlayContext";
import {
  getRecentNotificationsAction,
  markNotificationReadAction,
  type RecentNotification,
} from "@/app/(app)/notificaties/actions";

/**
 * Notifications as a popover/bottom-sheet instead of a full navigation —
 * you can glance at what's new without leaving the page you're on. The full
 * list at /notificaties (mark-all-read, delete, ...) stays fully intact;
 * this only adds a quick-glance layer in front of it.
 */
export function NotificationCenter({ count, variant }: { count: number; variant: "sidebar" | "mobile" }) {
  const { open, toggle, close } = useOverlay("notifications");
  const [loading, setLoading] = useState(false);
  const [notifications, setNotifications] = useState<RecentNotification[] | null>(null);
  const router = useRouter();

  useEscapeKey(open, close);

  function handleOpen() {
    const willOpen = !open;
    toggle();
    if (willOpen && notifications === null) {
      setLoading(true);
      void getRecentNotificationsAction()
        .then((result) => {
          setNotifications(result);
        })
        .catch(() => {
          setNotifications([]);
        })
        .finally(() => {
          setLoading(false);
        });
    }
  }

  function handleSelect(notification: RecentNotification) {
    if (!notification.is_read) {
      setNotifications((current) =>
        current ? current.map((n) => (n.id === notification.id ? { ...n, is_read: true } : n)) : current
      );
      void markNotificationReadAction(notification.id);
    }
    close();
    router.push(notification.link ?? "/notificaties");
  }

  const panelContent = (
    <>
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <p className="text-sm font-semibold text-foreground">Notificaties</p>
        <button
          type="button"
          onClick={close}
          aria-label="Sluiten"
          className="flex h-7 w-7 items-center justify-center rounded-full text-muted hover:bg-black/[.04] hover:text-voc-red dark:hover:bg-white/[.08]"
        >
          <X size={16} />
        </button>
      </div>
      <div className={variant === "mobile" ? "flex-1 overflow-y-auto" : "max-h-80 overflow-y-auto"}>
        {loading &&
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex flex-col gap-1.5 border-b border-border px-4 py-3 last:border-0">
              <Skeleton className="h-3.5 w-2/3" />
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-2.5 w-16" />
            </div>
          ))}
        {!loading && notifications?.length === 0 && (
          <p className="px-4 py-6 text-center text-sm text-muted">Geen notificaties.</p>
        )}
        {!loading &&
          notifications?.map((n) => (
            <button
              key={n.id}
              type="button"
              onClick={() => handleSelect(n)}
              className={clsx(
                "flex w-full flex-col items-start gap-0.5 border-b border-border px-4 py-3 text-left last:border-0 hover:bg-black/[.04] dark:hover:bg-white/[.06]",
                !n.is_read && "bg-voc-red-light/60"
              )}
            >
              <p className="text-sm font-medium text-foreground">{n.title}</p>
              {n.body && <p className="line-clamp-2 text-xs text-muted">{n.body}</p>}
              <p className="text-xs text-muted">{formatActivityDateShort(n.created_at)}</p>
            </button>
          ))}
      </div>
      <Link
        href="/notificaties"
        onClick={close}
        className="block border-t border-border px-4 py-2.5 text-center text-sm font-medium text-voc-red hover:bg-black/[.04] dark:hover:bg-white/[.06]"
      >
        Alles bekijken
      </Link>
    </>
  );

  if (variant === "mobile") {
    return (
      <>
        <button
          type="button"
          onClick={handleOpen}
          aria-label="Notificaties"
          className="relative flex h-9 w-9 items-center justify-center rounded-full text-foreground hover:bg-black/[.04] dark:hover:bg-white/[.08]"
        >
          <Bell size={20} />
          {count > 0 && (
            <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-voc-red px-1 text-[10px] font-medium text-white">
              {count > 9 ? "9+" : count}
            </span>
          )}
        </button>
        {open && (
          <div className="animate-fade-in fixed inset-0 z-50 flex flex-col bg-surface pb-[env(safe-area-inset-bottom)] pt-[env(safe-area-inset-top)]">
            {panelContent}
          </div>
        )}
      </>
    );
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={handleOpen}
        className={clsx(
          "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
          open ? "bg-voc-red-light text-voc-red" : "text-foreground hover:bg-black/[.04] dark:hover:bg-white/[.06]"
        )}
      >
        <Bell size={20} strokeWidth={open ? 2.5 : 2} />
        Notificaties
        {count > 0 && (
          <span className="ml-auto">
            <NavBadge count={count} />
          </span>
        )}
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40 cursor-pointer" onClick={close} />
          <div className="animate-scale-in absolute left-0 top-full z-50 mt-1 w-80 overflow-hidden rounded-xl border border-border bg-surface shadow-lg">
            {panelContent}
          </div>
        </>
      )}
    </div>
  );
}
