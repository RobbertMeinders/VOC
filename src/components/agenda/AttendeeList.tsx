import Link from "next/link";
import { Avatar } from "@/components/ui/Avatar";

export type Attendee = {
  id: string;
  first_name: string;
  last_name: string;
  avatarUrl: string | null;
};

export function AttendeeList({ attendees, waitlistCount }: { attendees: Attendee[]; waitlistCount: number }) {
  if (attendees.length === 0 && waitlistCount === 0) return null;

  return (
    <div className="rounded-2xl border border-border bg-surface p-6 shadow-sm">
      <h2 className="mb-3 text-sm font-semibold text-foreground">Wie gaat er ook</h2>
      {attendees.length > 0 ? (
        <div className="flex flex-col gap-2">
          {attendees.map((attendee) => (
            <Link
              key={attendee.id}
              href={`/leden/${attendee.id}`}
              className="flex items-center gap-2.5 rounded-lg px-1 py-1 hover:bg-black/[.04] dark:hover:bg-white/[.06]"
            >
              <Avatar
                firstName={attendee.first_name}
                lastName={attendee.last_name}
                avatarUrl={attendee.avatarUrl}
                size={28}
              />
              <span className="text-sm text-foreground">
                {attendee.first_name} {attendee.last_name}
              </span>
            </Link>
          ))}
        </div>
      ) : (
        <p className="text-sm text-muted">Nog niemand aangemeld.</p>
      )}
      {waitlistCount > 0 && (
        <p className="mt-3 text-xs text-muted">
          {waitlistCount} {waitlistCount === 1 ? "persoon" : "personen"} op de wachtlijst.
        </p>
      )}
    </div>
  );
}
