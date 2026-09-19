"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export function useUnreadNotificationCount(profileId: string, initialUnreadCount: number): number {
  const [count, setCount] = useState(initialUnreadCount);

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`notifications-${profileId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notifications", filter: `profile_id=eq.${profileId}` },
        () => setCount((c) => c + 1)
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "notifications", filter: `profile_id=eq.${profileId}` },
        (payload) => {
          const wasRead = Boolean((payload.old as { is_read?: boolean }).is_read);
          const isRead = Boolean((payload.new as { is_read?: boolean }).is_read);
          if (!wasRead && isRead) setCount((c) => Math.max(0, c - 1));
        }
      )
      .on(
        "postgres_changes",
        { event: "DELETE", schema: "public", table: "notifications", filter: `profile_id=eq.${profileId}` },
        (payload) => {
          const wasUnread = !(payload.old as { is_read?: boolean }).is_read;
          if (wasUnread) setCount((c) => Math.max(0, c - 1));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [profileId]);

  return count;
}
