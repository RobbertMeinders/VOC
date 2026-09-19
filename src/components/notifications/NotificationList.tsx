"use client";

import Link from "next/link";
import { useTransition } from "react";
import { Bell, X } from "lucide-react";
import { clsx } from "clsx";
import { formatActivityDateShort } from "@/lib/format/date";
import {
  deleteNotificationAction,
  markAllNotificationsReadAction,
  markNotificationReadAction,
} from "@/app/(app)/notificaties/actions";
import type { Database } from "@/lib/types/database";

type Notification = Database["public"]["Tables"]["notifications"]["Row"];

export function NotificationList({ notifications }: { notifications: Notification[] }) {
  const [, startTransition] = useTransition();
  const hasUnread = notifications.some((n) => !n.is_read);

  return (
    <div className="flex flex-col gap-2">
      {hasUnread && (
        <button
          type="button"
          onClick={() => startTransition(() => markAllNotificationsReadAction())}
          className="mb-1 self-end text-xs font-medium text-voc-red hover:underline"
        >
          Alles markeren als gelezen
        </button>
      )}
      {notifications.map((n) => (
        <div
          key={n.id}
          className={clsx(
            "flex items-start gap-3 rounded-xl border p-3 shadow-sm",
            n.is_read ? "border-border bg-surface" : "border-voc-red/30 bg-voc-red-light"
          )}
        >
          <Bell size={16} className={clsx("mt-0.5 shrink-0", n.is_read ? "text-muted" : "text-voc-red")} />
          <Link
            href={n.link ?? "/"}
            onClick={() => {
              if (!n.is_read) startTransition(() => markNotificationReadAction(n.id));
            }}
            className="min-w-0 flex-1"
          >
            <p className="text-sm font-medium text-foreground">{n.title}</p>
            {n.body && <p className="text-sm text-muted">{n.body}</p>}
            <p className="mt-0.5 text-xs text-muted">{formatActivityDateShort(n.created_at)}</p>
          </Link>
          <button
            type="button"
            title="Verwijderen"
            aria-label="Verwijderen"
            onClick={() => startTransition(() => deleteNotificationAction(n.id))}
            className="mt-0.5 text-muted hover:text-voc-red"
          >
            <X size={14} />
          </button>
        </div>
      ))}
    </div>
  );
}
