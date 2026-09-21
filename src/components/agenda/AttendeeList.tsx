"use client";

import { useState } from "react";
import Link from "next/link";
import { X } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { useEscapeKey } from "@/lib/dom/useEscapeKey";

export type Attendee = {
  id: string;
  first_name: string;
  last_name: string;
  avatarUrl: string | null;
};

const VISIBLE_ATTENDEES = 5;

function AttendeeRow({ attendee, onClick }: { attendee: Attendee; onClick?: () => void }) {
  return (
    <Link
      href={`/leden/${attendee.id}`}
      onClick={onClick}
      className="flex items-center gap-2.5 rounded-lg px-1 py-1 hover:bg-black/[.04] dark:hover:bg-white/[.06]"
    >
      <Avatar firstName={attendee.first_name} lastName={attendee.last_name} avatarUrl={attendee.avatarUrl} size={28} />
      <span className="text-sm text-foreground">
        {attendee.first_name} {attendee.last_name}
      </span>
    </Link>
  );
}

export function AttendeeList({ attendees, waitlistCount }: { attendees: Attendee[]; waitlistCount: number }) {
  const [showAll, setShowAll] = useState(false);
  useEscapeKey(showAll, () => setShowAll(false));

  if (attendees.length === 0 && waitlistCount === 0) return null;

  const visible = attendees.slice(0, VISIBLE_ATTENDEES);
  const remaining = attendees.length - visible.length;

  return (
    <div className="rounded-2xl border border-border bg-surface p-6 shadow-sm">
      <h2 className="mb-3 text-sm font-semibold text-foreground">Wie gaat er ook</h2>
      {attendees.length > 0 ? (
        <div className="flex flex-col gap-2">
          {visible.map((attendee) => (
            <AttendeeRow key={attendee.id} attendee={attendee} />
          ))}
          {remaining > 0 && (
            <button
              type="button"
              onClick={() => setShowAll(true)}
              className="mt-1 self-start text-sm font-medium text-voc-red hover:underline"
            >
              en {remaining} {remaining === 1 ? "ander" : "anderen"}
            </button>
          )}
        </div>
      ) : (
        <p className="text-sm text-muted">Nog niemand aangemeld.</p>
      )}
      {waitlistCount > 0 && (
        <p className="mt-3 text-xs text-muted">
          {waitlistCount} {waitlistCount === 1 ? "persoon" : "personen"} op de wachtlijst.
        </p>
      )}

      {showAll && (
        <>
          <div className="fixed inset-0 z-40 bg-black/40" onClick={() => setShowAll(false)} />
          <div className="fixed inset-x-4 top-1/2 z-50 max-h-[70vh] -translate-y-1/2 overflow-hidden rounded-2xl border border-border bg-surface shadow-lg sm:inset-x-auto sm:left-1/2 sm:w-80 sm:-translate-x-1/2">
            <div className="flex items-center justify-between border-b border-border px-4 py-3">
              <p className="text-sm font-semibold text-foreground">Wie gaat er ook ({attendees.length})</p>
              <button
                type="button"
                onClick={() => setShowAll(false)}
                aria-label="Sluiten"
                className="flex h-7 w-7 items-center justify-center rounded-full text-muted hover:bg-black/[.04] hover:text-voc-red dark:hover:bg-white/[.08]"
              >
                <X size={16} />
              </button>
            </div>
            <div className="max-h-[55vh] overflow-y-auto p-2">
              {attendees.map((attendee) => (
                <AttendeeRow key={attendee.id} attendee={attendee} onClick={() => setShowAll(false)} />
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
