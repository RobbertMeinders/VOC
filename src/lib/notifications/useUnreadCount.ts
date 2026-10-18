"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { authenticateRealtime } from "@/lib/realtime/authenticate";
import { markNotificationsReadByIdsAction } from "@/app/(app)/notificaties/actions";

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
export type MarkAllNotificationsRead = () => void;
export type MarkSectionRead = (section: keyof Omit<UnreadNotificationSections, "total">) => void;

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

// "Alles markeren als gelezen" werkt op de server ALLE ongelezen rijen van
// het profiel bij, niet alleen de (beperkte) lijst die de aanroeper net
// toevallig had ingeladen — zonder deze eigen context zou het lokale
// badge-aantal na zo'n actie nooit verder dalen dan "min het aantal rijen
// dat de aanroeper zelf kende", terwijl de database al 0 ongelezen had.
const MarkAllNotificationsReadContext = createContext<MarkAllNotificationsRead | null>(null);
export const MarkAllNotificationsReadProvider = MarkAllNotificationsReadContext.Provider;

export function useMarkAllNotificationsRead(): MarkAllNotificationsRead {
  const markAllRead = useContext(MarkAllNotificationsReadContext);
  return markAllRead ?? (() => {});
}

// Zodra je een sectie als Agenda daadwerkelijk opent, zijn de meldingen die
// daarnaar linken gelezen — zonder dit moest je elke melding apart via de bel
// aanklikken voordat het bijbehorende badge-aantal verdween.
const MarkSectionReadContext = createContext<MarkSectionRead | null>(null);
export const MarkSectionReadProvider = MarkSectionReadContext.Provider;

export function useMarkSectionRead(): MarkSectionRead {
  const markSectionRead = useContext(MarkSectionReadContext);
  return markSectionRead ?? (() => {});
}

export function useUnreadNotificationCount(
  profileId: string,
  initialUnread: UnreadNotification[]
): {
  sections: UnreadNotificationSections;
  markRead: MarkNotificationRead;
  markAllRead: MarkAllNotificationsRead;
  markSectionRead: MarkSectionRead;
} {
  const [items, setItems] = useState(initialUnread);

  const markRead = useCallback((id: string) => {
    setItems((current) => current.filter((item) => item.id !== id));
  }, []);

  const markAllRead = useCallback(() => {
    setItems([]);
  }, []);

  const markSectionRead = useCallback((section: keyof Omit<UnreadNotificationSections, "total">) => {
    setItems((current) => {
      const toMark = current.filter((item) => sectionFor(item.link) === section);
      if (toMark.length === 0) return current;
      void markNotificationsReadByIdsAction(toMark.map((item) => item.id));
      return current.filter((item) => sectionFor(item.link) !== section);
    });
  }, []);

  useEffect(() => {
    const supabase = createClient();
    const stopRealtimeAuth = authenticateRealtime(supabase);
    const channel = supabase
      .channel(`notifications-${profileId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notifications", filter: `profile_id=eq.${profileId}` },
        (payload) => {
          const row = payload.new as { id: string; link: string | null; type: string; channel_inapp_allowed: boolean };
          // Zelfde uitsluiting als de initiële SSR-fetch in layout.tsx: anders
          // telt een live binnenkomende newsletter-rij of een rij waarvan het
          // in-app-kanaal uitstaat wél mee totdat de pagina ververst, terwijl
          // hij na verversen alsnog (terecht) niet meetelt.
          if (!row.channel_inapp_allowed || row.type === "newsletter") return;
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
      stopRealtimeAuth();
      supabase.removeChannel(channel);
    };
  }, [profileId]);

  return { sections: toSections(items), markRead, markAllRead, markSectionRead };
}
