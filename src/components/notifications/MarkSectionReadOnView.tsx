"use client";

import { useEffect } from "react";
import { useMarkSectionRead, type UnreadNotificationSections } from "@/lib/notifications/useUnreadCount";

// Rendert niets zelf — markeert bij het openen van deze pagina alle
// meldingen die naar deze sectie linken (zie sectionFor in useUnreadCount.ts)
// als gelezen, zodat het bijbehorende badge-aantal (bv. op "Agenda")
// verdwijnt zonder dat je eerst elke melding apart via de bel moet aanklikken.
export function MarkSectionReadOnView({ section }: { section: keyof Omit<UnreadNotificationSections, "total"> }) {
  const markSectionRead = useMarkSectionRead();

  useEffect(() => {
    markSectionRead(section);
  }, [markSectionRead, section]);

  return null;
}
