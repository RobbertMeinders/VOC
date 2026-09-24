import type { Metadata } from "next";
import { Check, Minus } from "lucide-react";
import { requireBoard } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { BackLink } from "@/components/ui/BackLink";
import type { Database } from "@/lib/types/database";

type Notification = Database["public"]["Tables"]["notifications"]["Row"];

export const metadata: Metadata = { title: "Notificaties" };

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

  const { data: notifications } = await supabase
    .from("notifications")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(LOG_LIMIT)
    .returns<Notification[]>();

  return (
    <div className="flex flex-col gap-4">
      <BackLink href="/beheer" label="Terug naar Beheer" />
      <div>
        <h1 className="text-xl font-semibold text-foreground">Notificaties</h1>
        <p className="text-sm text-muted">
          Logboek van de {LOG_LIMIT} meest recente notificaties — type, en of ze als push en/of e-mail zijn
          verstuurd.
        </p>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-border bg-surface shadow-sm">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-border text-xs text-muted">
              <th className="px-4 py-2 font-medium">Titel</th>
              <th className="px-4 py-2 font-medium">Type</th>
              <th className="px-4 py-2 font-medium">Aangemaakt</th>
              <th className="px-4 py-2 text-center font-medium">Push</th>
              <th className="px-4 py-2 text-center font-medium">E-mail</th>
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
                  <ChannelStatus sent={Boolean(n.emailed_at)} />
                </td>
              </tr>
            ))}
            {(notifications ?? []).length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-sm text-muted">
                  Nog geen notificaties.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
