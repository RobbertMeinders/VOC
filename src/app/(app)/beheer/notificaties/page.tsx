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
  return sent ? <Check size={14} className="text-green-600" /> : <Minus size={14} className="text-muted" />;
}

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString("nl-NL", { dateStyle: "short", timeStyle: "short" });
}

export default async function BeheerNotificatiesPage() {
  await requireBoard();
  const supabase = await createClient();

  // E-mail-open-events worden niet meer verzameld (zie de "E-mail geopend"-
  // kolom hieronder) — alleen push-opens nog ophalen.
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
        description={`Logboek van de ${LOG_LIMIT} meest recente meldingen — per stuk te zien of ze als push en/of e-mail zijn verstuurd en geopend.`}
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
              <th
                className="px-4 py-2 text-center font-medium"
                title="Niet beschikbaar: de eigen SMTP-mailbox levert geen open-tracking (dat vereiste eerder een Resend-webhook). Staat daarom altijd op n.v.t."
              >
                E-mail geopend
              </th>
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
                <td className="px-4 py-2 text-center text-xs text-muted">n.v.t.</td>
              </tr>
            ))}
            {(notifications ?? []).length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-6 text-center text-sm text-muted">
                  Nog geen meldingen.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-muted">
        &quot;E-mail geopend&quot; staat op n.v.t.: de eigen SMTP-mailbox levert geen open-tracking.
      </p>
    </div>
  );
}
