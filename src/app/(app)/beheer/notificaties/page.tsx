import type { Metadata } from "next";
import { Check, Minus } from "lucide-react";
import { requireBoard } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/ui/PageHeader";
import type { Database } from "@/lib/types/database";

type Notification = Database["public"]["Tables"]["notifications"]["Row"];

export const metadata: Metadata = { title: "Verzonden meldingen" };

const LOG_LIMIT = 100;

function ChannelStatus({ sent }: { sent: boolean }) {
  return sent ? <Check size={14} className="text-status-success" /> : <Minus size={14} className="text-muted" />;
}

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString("nl-NL", { dateStyle: "short", timeStyle: "short" });
}

export default async function BeheerNotificatiesPage() {
  await requireBoard();
  const supabase = await createClient();

  // E-mail-open-events worden niet verzameld (de eigen SMTP-mailbox levert
  // geen open-tracking) — alleen push-opens ophalen.
  const [{ data: notifications }, { data: openEvents }] = await Promise.all([
    supabase
      .from("notifications")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(LOG_LIMIT)
      .returns<Notification[]>(),
    supabase.from("events").select("target_id, metadata").eq("event_type", "notification_opened"),
  ]);

  const openedPushIds = new Set<string>();
  for (const e of openEvents ?? []) {
    if (!e.target_id) continue;
    const channel = (e.metadata as { channel?: string } | null)?.channel;
    if (channel === "push") openedPushIds.add(e.target_id);
  }

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="Verzonden meldingen"
        description={`De laatste ${LOG_LIMIT} meldingen.`}
      />

      <div className="overflow-x-auto rounded-2xl border border-border bg-surface shadow-sm">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-border text-xs text-muted">
              <th className="px-4 py-2 font-medium">Titel</th>
              <th className="px-4 py-2 font-medium">Type</th>
              <th className="px-4 py-2 font-medium">Aangemaakt</th>
              <th className="px-4 py-2 text-center font-medium">Push verstuurd</th>
              <th className="px-4 py-2 text-center font-medium">Push geopend</th>
              <th className="px-4 py-2 text-center font-medium">E-mail verstuurd</th>
            </tr>
          </thead>
          <tbody>
            {(notifications ?? []).map((n) => (
              <tr key={n.id} className="border-b border-border last:border-0">
                <td className="max-w-xs truncate px-4 py-2 text-foreground">{n.title}</td>
                <td className="px-4 py-2 text-muted">{n.type}</td>
                <td className="px-4 py-2 text-muted">{formatDateTime(n.created_at)}</td>
                <td className="px-4 py-2 text-center">
                  <ChannelStatus sent={Boolean(n.pushed_at)} />
                </td>
                <td className="px-4 py-2 text-center">
                  <ChannelStatus sent={openedPushIds.has(n.id)} />
                </td>
                <td className="px-4 py-2 text-center">
                  <ChannelStatus sent={Boolean(n.emailed_at)} />
                </td>
              </tr>
            ))}
            {(notifications ?? []).length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-sm text-muted">
                  Nog geen meldingen.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
