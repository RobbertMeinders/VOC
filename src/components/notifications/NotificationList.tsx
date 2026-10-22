"use client";

import Link from "next/link";
import { useRef, useState, type MouseEvent, type ReactNode, type TouchEvent } from "react";
import { Bell, Trash2, X } from "lucide-react";
import { clsx } from "clsx";
import { formatActivityDateShort } from "@/lib/format/date";
import {
  deleteNotificationAction,
  markAllNotificationsReadAction,
  markNotificationReadAction,
} from "@/app/(app)/notificaties/actions";
import { useMarkAllNotificationsRead, useMarkNotificationRead } from "@/lib/notifications/useUnreadCount";
import { useToast } from "@/lib/ui/ToastContext";
import type { Database } from "@/lib/types/database";

type Notification = Database["public"]["Tables"]["notifications"]["Row"];

// Naar links vegen om een melding te verwijderen. Drempel om te
// verwijderen vs. gewoon een tikje bewegen (zoals bij RouteOverlayPanel's
// naar-beneden-vegen, zelfde patroon maar dan horizontaal).
const SWIPE_THRESHOLD = 70;
const SWIPE_MAX = 96;
// Zelfde vloeiende easing als RouteOverlayPanel's sleep-animatie.
const SWIPE_EASING = "cubic-bezier(0.16, 1, 0.3, 1)";
// Alles hieronder is "per ongeluk bewogen tijdens een tik", niet een echte
// veeg — zonder dit onderdrukt elke kleine trilling tijdens een tik ook de
// navigatie naar de melding.
const DRAG_CLICK_GUARD = 6;
// F1 (UX-audit): verwijderen is nu ongedaan te maken — de rij verdwijnt al
// meteen uit beeld (optimistisch, net als voorheen), maar de server-
// verwijdering wordt pas na dit venster echt uitgevoerd. Zelfde duur als de
// actietoast hieronder (ToastContext), anders is de knop alweer weg
// voordat het venster sluit.
const UNDO_WINDOW_MS = 6000;

export function NotificationList({
  notifications: initialNotifications,
  emptyState = null,
}: {
  notifications: Notification[];
  // F1 (UX-audit): de aanroepers (/notificaties, de mobiele sheet) bepaalden
  // voorheen zelf, op basis van hun eigen (server-opgehaalde of eenmalig
  // geladen) kopie, of ze deze lijst óf hun eigen "geen meldingen"-tekst
  // toonden — maar verwijderen gebeurt alleen in de lokale state hierbinnen,
  // dus na het weggooien van de laatste melding bleef die buitenste check
  // hangen op "er zijn er nog" en toonde deze lijst gewoon niks i.p.v. de
  // lege-staat. Nu geeft deze component zelf zijn lege staat weer, zodra zijn
  // eigen (wél live bijgewerkte) lijst leeg raakt.
  emptyState?: ReactNode;
}) {
  // Local, optimistic copy: the server action's revalidatePath only refreshes
  // this page on its *next* load, but clicking a notification navigates away
  // immediately — so without local state the read/deleted status only ever
  // showed up after a manual refresh. Updating here happens instantly; the
  // server action still runs in the background to persist it.
  const [notifications, setNotifications] = useState(initialNotifications);
  const hasUnread = notifications.some((n) => !n.is_read);
  // Zelfde reden als in NotificationCenter: dit werkt alleen de lokale lijst
  // hier bij, niet het badge-aantal in de sidebar/mobiele header — dat zit
  // in AppShell, dus die moet los meteen op de hoogte gebracht worden i.p.v.
  // te wachten op de Realtime-round-trip.
  const markReadGlobally = useMarkNotificationRead();
  const markAllReadGlobally = useMarkAllNotificationsRead();
  const toast = useToast();
  // Nog niet definitief verwijderd — timeout + waar de rij terug moet als
  // "Ongedaan maken" wordt aangeklikt. Een ref i.p.v. state: wijzigingen
  // hierin hoeven zelf geen re-render te veroorzaken.
  const pendingDeletes = useRef(new Map<string, { timeout: ReturnType<typeof setTimeout>; item: Notification; index: number }>());

  function handleOpen(notification: Notification) {
    if (notification.is_read) return;
    setNotifications((current) => current.map((n) => (n.id === notification.id ? { ...n, is_read: true } : n)));
    markReadGlobally(notification.id);
    void markNotificationReadAction(notification.id);
  }

  function handleDelete(notificationId: string) {
    const index = notifications.findIndex((n) => n.id === notificationId);
    const item = notifications[index];
    if (!item) return;
    setNotifications((current) => current.filter((n) => n.id !== notificationId));

    // Het badge-aantal/de server-rij pas écht bijwerken zodra het venster
    // verstreken is — bij "Ongedaan maken" is er dan niets te herstellen.
    const timeout = setTimeout(() => {
      pendingDeletes.current.delete(notificationId);
      markReadGlobally(notificationId);
      void deleteNotificationAction(notificationId);
    }, UNDO_WINDOW_MS);
    pendingDeletes.current.set(notificationId, { timeout, item, index });

    toast("Melding verwijderd.", "success", {
      label: "Ongedaan maken",
      onClick: () => {
        const pending = pendingDeletes.current.get(notificationId);
        if (!pending) return;
        clearTimeout(pending.timeout);
        pendingDeletes.current.delete(notificationId);
        setNotifications((current) => {
          const next = [...current];
          next.splice(Math.min(pending.index, next.length), 0, pending.item);
          return next;
        });
      },
    });
  }

  function handleMarkAllRead() {
    // markAllReadGlobally leegt de hele ongelezen-lijst i.p.v. alleen de hier
    // geladen (mogelijk beperkte) `notifications` — markAllNotificationsReadAction
    // markeert op de server immers ook alles, niet alleen wat hier zichtbaar is.
    markAllReadGlobally();
    setNotifications((current) => current.map((n) => ({ ...n, is_read: true })));
    void markAllNotificationsReadAction();
  }

  if (notifications.length === 0) return <>{emptyState}</>;

  return (
    <div className="flex flex-col gap-2">
      {hasUnread && (
        <button
          type="button"
          onClick={handleMarkAllRead}
          className="mb-1 self-end text-xs font-medium text-petrol hover:underline"
        >
          Alles gelezen
        </button>
      )}
      {notifications.map((n) => (
        <NotificationRow key={n.id} notification={n} onOpen={() => handleOpen(n)} onDelete={() => handleDelete(n.id)} />
      ))}
    </div>
  );
}

function NotificationRow({
  notification: n,
  onOpen,
  onDelete,
}: {
  notification: Notification;
  onOpen: () => void;
  onDelete: () => void;
}) {
  const [dragX, setDragX] = useState(0);
  const [dragging, setDragging] = useState(false);
  // Na het loslaten voorbij de drempel: de rij vliegt eerst vloeiend verder
  // naar links en verdwijnt pas daarna (onTransitionEnd) echt uit de lijst
  // — in plaats van abrupt te verdwijnen zodra de vinger loslaat.
  const [removing, setRemoving] = useState(false);
  const touchStartX = useRef(0);
  const didDrag = useRef(false);
  const rowRef = useRef<HTMLDivElement>(null);

  function handleTouchStart(e: TouchEvent) {
    touchStartX.current = e.touches[0].clientX;
    didDrag.current = false;
    setDragging(true);
  }

  function handleTouchMove(e: TouchEvent) {
    const delta = e.touches[0].clientX - touchStartX.current;
    if (delta >= 0) return;
    if (delta < -DRAG_CLICK_GUARD) didDrag.current = true;
    // Robberts feedback: een harde Math.max-klem liet de rij bij SWIPE_MAX
    // abrupt stilvallen terwijl de vinger nog bewoog — voelde "geforceerd".
    // Nu rekbandweerstand voorbij die grens (net als iOS' overscroll-bounce):
    // de rij blijft meebewegen, alleen steeds trager, i.p.v. in één keer te
    // pletter te lopen tegen een muur.
    const distance = -delta;
    const resisted = distance <= SWIPE_MAX ? distance : SWIPE_MAX + (distance - SWIPE_MAX) * 0.25;
    setDragX(-resisted);
  }

  function handleTouchEnd() {
    setDragging(false);
    if (dragX < -SWIPE_THRESHOLD) {
      const width = rowRef.current?.offsetWidth ?? SWIPE_MAX * 4;
      setRemoving(true);
      setDragX(-width);
      return;
    }
    setDragX(0);
  }

  // Een tik die (bijna) niet bewogen heeft is een gewone tik — alleen een
  // echte veeg mag de navigatie naar de melding onderdrukken.
  function handleLinkClick(e: MouseEvent) {
    if (didDrag.current) {
      e.preventDefault();
      return;
    }
    onOpen();
  }

  return (
    <div className="relative overflow-hidden rounded-xl">
      <div className="absolute inset-y-0 right-0 flex w-20 items-center justify-center rounded-r-xl bg-voc-red text-white" aria-hidden>
        <Trash2 size={18} />
      </div>
      <div
        ref={rowRef}
        className={clsx(
          "relative flex items-start gap-3 rounded-xl border border-border p-3 shadow-sm",
          // Afwerkronde blok 3: een hele petrol-soft kaart per ongelezen
          // melding oogde als een extra kleurvlak per rij; een stipje +
          // een iets lichtere ondergrond valt net zo goed op.
          n.is_read ? "bg-surface" : "bg-raised"
        )}
        style={{
          transform: `translateX(${dragX}px)`,
          opacity: removing ? 0 : 1,
          transition: dragging ? "none" : `transform 0.3s ${SWIPE_EASING}, opacity 0.3s ${SWIPE_EASING}`,
          touchAction: "pan-y",
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onTransitionEnd={() => {
          if (removing) onDelete();
        }}
      >
        <Bell size={16} className={clsx("mt-0.5 shrink-0", n.is_read ? "text-muted" : "text-petrol")} />
        {/* Zonder eigen bestemming (bv. een los aangekondigde mededeling)
            leidde dit altijd naar de homepage, wat een doel suggereerde dat
            er niet is — dan liever helemaal niet klikbaar i.p.v. een
            misleidende link. */}
        {n.link ? (
          <Link href={n.link} onClick={handleLinkClick} className="min-w-0 flex-1">
            <p className="flex items-center gap-1.5 text-sm font-medium text-foreground">
              {!n.is_read && <span aria-hidden className="h-1.5 w-1.5 shrink-0 rounded-full bg-voc-red" />}
              {n.title}
            </p>
            {n.body && <p className="text-sm text-muted">{n.body}</p>}
            <p className="mt-0.5 text-xs text-muted">{formatActivityDateShort(n.created_at)}</p>
          </Link>
        ) : (
          <div className="min-w-0 flex-1">
            <p className="flex items-center gap-1.5 text-sm font-medium text-foreground">
              {!n.is_read && <span aria-hidden className="h-1.5 w-1.5 shrink-0 rounded-full bg-voc-red" />}
              {n.title}
            </p>
            {n.body && <p className="text-sm text-muted">{n.body}</p>}
            <p className="mt-0.5 text-xs text-muted">{formatActivityDateShort(n.created_at)}</p>
          </div>
        )}
        <button
          type="button"
          title="Verwijderen"
          aria-label="Verwijderen"
          onClick={onDelete}
          className="mt-0.5 text-muted hover:text-foreground"
        >
          <X size={14} />
        </button>
      </div>
    </div>
  );
}
