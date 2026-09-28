"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
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

export type MarkNotificationRead = (id: string) => void;

// Alleen de knop/kaart waarop je klikt weet meteen dat een notificatie
// gelezen is — het badge-aantal in de sidebar/mobiele header zit in AppShell,
// een heel ander deel van de boom. Zonder deze context moest de badge
// wachten op de Supabase Realtime UPDATE-event die pas terugkomt nadat de
// server action de rij daadwerkelijk heeft weggeschreven — een voelbare
// vertraging tussen klikken en de teller zien dalen. AppShell geeft hier zijn
// eigen `markRead` (die dezelfde lokale filter doet als de realtime-handler
// hieronder) via context door, zodat elke plek die een notificatie
// gelezen markeert de badge ook meteen, optimistisch, kan bijwerken.
const MarkNotificationReadContext = createContext<MarkNotificationRead | null>(null);
export const MarkNotificationReadProvider = MarkNotificationReadContext.Provider;

export function useMarkNotificationRead(): MarkNotificationRead {
  const markRead = useContext(MarkNotificationReadContext);
  return markRead ?? (() => {});
}

export function useUnreadNotificationCount(
  profileId: string,
  initialUnread: UnreadNotification[]
): { sections: UnreadNotificationSections; markRead: MarkNotificationRead } {
  const [items, setItems] = useState(initialUnread);

  const markRead = useCallback((id: string) => {
    setItems((current) => current.filter((item) => item.id !== id));
  }, []);

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

  return { sections: toSections(items), markRead };
}
