"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export type UnreadNotification = { id: string; link: string | null };

export type UnreadNotificationSections = {
  total: number;
  agenda: number;
  netwerk: number;
  beheer: number;
};

function sectionFor(link: string | null): keyof Omit<UnreadNotificationSections, "total"> | null {
  if (!link) return null;
  if (link.startsWith("/agenda")) return "agenda";
  if (link.startsWith("/leden") || link.startsWith("/bedrijven")) return "netwerk";
  if (link.startsWith("/beheer")) return "beheer";
  return null;
}

function toSections(items: UnreadNotification[]): UnreadNotificationSections {
  const sections: UnreadNotificationSections = { total: items.length, agenda: 0, netwerk: 0, beheer: 0 };
  for (const item of items) {
    const section = sectionFor(item.link);
    if (section) sections[section] += 1;
  }
  return sections;
}

export function useUnreadNotificationCount(
  profileId: string,
  initialUnread: UnreadNotification[]
): UnreadNotificationSections {
  const [items, setItems] = useState(initialUnread);

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`notifications-${profileId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notifications", filter: `profile_id=eq.${profileId}` },
        (payload) => {
          const row = payload.new as { id: string; link: string | null };
          setItems((current) => [...current, { id: row.id, link: row.link }]);
        }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "notifications", filter: `profile_id=eq.${profileId}` },
        (payload) => {
          const wasRead = Boolean((payload.old as { is_read?: boolean }).is_read);
          const isRead = Boolean((payload.new as { is_read?: boolean }).is_read);
          const row = payload.new as { id: string; link: string | null };
          if (!wasRead && isRead) {
            setItems((current) => current.filter((item) => item.id !== row.id));
          }
        }
      )
      .on(
        "postgres_changes",
        { event: "DELETE", schema: "public", table: "notifications", filter: `profile_id=eq.${profileId}` },
        (payload) => {
          const row = payload.old as { id: string };
          setItems((current) => current.filter((item) => item.id !== row.id));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [profileId]);

  return toSections(items);
}
