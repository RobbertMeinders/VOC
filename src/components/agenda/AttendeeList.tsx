"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Check, X } from "lucide-react";
import { clsx } from "clsx";
import { Avatar } from "@/components/ui/Avatar";
import { useEscapeKey } from "@/lib/dom/useEscapeKey";
import { useBodyScrollLock } from "@/lib/dom/useBodyScrollLock";
import { setAttendanceAction } from "@/app/(app)/agenda/actions";

export type Attendee = {
  id: string;
  first_name: string;
  last_name: string;
  avatarUrl: string | null;
  registrationId: string;
  attended: boolean;
};

const VISIBLE_ATTENDEES = 5;

function AttendanceCheckbox({ attendee, activityId }: { attendee: Attendee; activityId: string }) {
  const [attended, setAttended] = useState(attendee.attended);
  const [isPending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={isPending}
      onClick={() => {
        const next = !attended;
        setAttended(next);
        startTransition(async () => {
          await setAttendanceAction(attendee.registrationId, activityId, next);
        });
      }}
      title={attended ? "Gemarkeerd als aanwezig geweest" : "Markeer als aanwezig geweest"}
      aria-label={attended ? "Gemarkeerd als aanwezig geweest" : "Markeer als aanwezig geweest"}
      className={clsx(
        "flex h-6 w-6 shrink-0 items-center justify-center rounded-full border disabled:opacity-50",
        attended ? "border-voc-red bg-voc-red text-white" : "border-border text-transparent hover:border-voc-red"
      )}
    >
      <Check size={14} />
    </button>
  );
}

function AttendeeRow({
  attendee,
  activityId,
  canManage,
  onClick,
}: {
  attendee: Attendee;
  activityId?: string;
  canManage?: boolean;
  onClick?: () => void;
}) {
  return (
    <div className="flex items-center gap-2 rounded-lg px-1 py-1 hover:bg-black/[.04] dark:hover:bg-white/[.06]">
      <Link href={`/leden/${attendee.id}`} onClick={onClick} className="flex min-w-0 flex-1 items-center gap-2.5">
        <Avatar firstName={attendee.first_name} lastName={attendee.last_name} avatarUrl={attendee.avatarUrl} size={28} />
        <span className="truncate text-sm text-foreground">
          {attendee.first_name} {attendee.last_name}
        </span>
      </Link>
      {canManage && activityId && <AttendanceCheckbox attendee={attendee} activityId={activityId} />}
    </div>
  );
}

export function AttendeeList({
  attendees,
  waitlistCount,
  activityId,
  canManage = false,
}: {
  attendees: Attendee[];
  waitlistCount: number;
  activityId?: string;
  canManage?: boolean;
}) {
  const [showAll, setShowAll] = useState(false);
  useEscapeKey(showAll, () => setShowAll(false));
  useBodyScrollLock(showAll);

  if (attendees.length === 0 && waitlistCount === 0) return null;

  const visible = attendees.slice(0, VISIBLE_ATTENDEES);
  const remaining = attendees.length - visible.length;

  return (
    <div className="rounded-2xl border border-border bg-surface p-6 shadow-sm">
      <h2 className="mb-3 text-sm font-semibold text-foreground">Wie gaat er ook</h2>
      {canManage && (
        <p className="mb-3 text-xs text-muted">Vink af wie er daadwerkelijk was — dat verschijnt dan op hun profiel.</p>
      )}
      {attendees.length > 0 ? (
        <div className="flex flex-col gap-2">
          {visible.map((attendee) => (
            <AttendeeRow key={attendee.id} attendee={attendee} activityId={activityId} canManage={canManage} />
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
          <div className="fixed inset-0 z-40 cursor-pointer bg-black/40 animate-fade-in" onClick={() => setShowAll(false)} />
          <div className="fixed inset-x-4 top-1/2 z-50 -translate-y-1/2 sm:inset-x-auto sm:left-1/2 sm:w-80 sm:-translate-x-1/2">
            <div className="animate-scale-in max-h-[70vh] overflow-hidden rounded-2xl border border-border bg-surface shadow-lg">
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
                  <AttendeeRow
                    key={attendee.id}
                    attendee={attendee}
                    activityId={activityId}
                    canManage={canManage}
                    onClick={() => setShowAll(false)}
                  />
                ))}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
