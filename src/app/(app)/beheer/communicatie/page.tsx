import type { Metadata } from "next";
import Link from "next/link";
import { Megaphone, Plus, Users, Bell } from "lucide-react";
import { requireBoard } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { ComingSoon } from "@/components/ui/ComingSoon";
import { Chip } from "@/components/ui/Chip";
import { PageHeader } from "@/components/ui/PageHeader";
import { CommunicationRow } from "@/components/beheer/CommunicationRow";
import { NotificationRuleRow } from "@/components/beheer/NotificationRuleRow";
import { getAppSettings } from "@/lib/settings/app-settings";
import { createCommunicationAction } from "./actions";
import { CONFIGURABLE_NOTIFICATION_TYPES, ROLE_BASED_NOTIFICATION_TYPES, type ConfigurableNotificationType } from "@/lib/notifications/type-labels";
import type { Database } from "@/lib/types/database";

export const metadata: Metadata = { title: "Nieuwsbrieven" };

type Communication = Database["public"]["Tables"]["communications"]["Row"] & {
  activity: { title: string } | null;
};

const TABS = [
  { key: "nieuwsbrieven", label: "Nieuwsbrieven", icon: Megaphone },
  { key: "notificatieregels", label: "Notificatieregels", icon: Bell },
] as const;
type TabKey = (typeof TABS)[number]["key"];

async function NieuwsbrievenTab() {
  const supabase = await createClient();

  const [{ data: communications }, settings] = await Promise.all([
    supabase.from("communications").select("*, activity:activities(title)").order("created_at", { ascending: false }).returns<Communication[]>(),
    getAppSettings(),
  ]);

  const concepten = (communications ?? []).filter((c) => c.status !== "verzonden");
  const verzonden = (communications ?? []).filter((c) => c.status === "verzonden");

  return (
    <div className="flex flex-col gap-4">
      <div className="flex w-full flex-wrap items-center justify-end gap-2">
        <Link
          href="/beheer/communicatie/doelgroepen"
          className="flex items-center justify-center gap-1.5 rounded-full border border-border bg-surface px-3 py-1.5 text-sm font-medium text-foreground hover:bg-black/[.03] dark:hover:bg-white/[.06]"
        >
          <Users size={16} />
          Doelgroepen
        </Link>
        <form action={createCommunicationAction} className="flex-1 sm:flex-none">
          <button
            type="submit"
            className="flex w-full items-center justify-center gap-1.5 rounded-full bg-voc-red px-3 py-1.5 text-sm font-medium text-white hover:bg-voc-red-dark sm:w-auto"
          >
            <Plus size={16} />
            Nieuwe nieuwsbrief
          </button>
        </form>
      </div>

      {(communications ?? []).length === 0 ? (
        <ComingSoon
          icon={Megaphone}
          title="Nog geen nieuwsbrieven"
        />
      ) : (
        <>
          <div>
            <h2 className="mb-2 text-sm font-semibold text-foreground">Concepten</h2>
            {concepten.length > 0 ? (
              <div className="flex flex-col gap-2">
                {concepten.map((c) => (
                  <CommunicationRow key={c.id} communication={c} orgName={settings.org_name} logoUrl={settings.logo_url} />
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted">Geen openstaande concepten.</p>
            )}
          </div>

          <div>
            <h2 className="mb-2 text-sm font-semibold text-foreground">Verzonden</h2>
            {verzonden.length > 0 ? (
              <div className="flex flex-col gap-2">
                {verzonden.map((c) => (
                  <CommunicationRow key={c.id} communication={c} orgName={settings.org_name} logoUrl={settings.logo_url} />
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted">Nog niets verzonden.</p>
            )}
          </div>
        </>
      )}
    </div>
  );
}

async function NotificatieregelsTab() {
  const supabase = await createClient();
  const { data: rows } = await supabase
    .from("notification_type_settings")
    .select("*")
    .returns<Database["public"]["Tables"]["notification_type_settings"]["Row"][]>();

  const byType = new Map((rows ?? []).map((row) => [row.type, row]));

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-muted">
        Per type melding: welke rollen &apos;m krijgen (voor de types die naar bestuur/beheer gaan), via welke kanalen, en of de regel aan staat.
        Persoonlijke voorkeuren van leden zelf (zie Instellingen) blijven hier bovenop gelden.
      </p>
      <div className="overflow-x-auto rounded-2xl border border-border bg-surface shadow-sm">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-border text-xs text-muted">
              <th className="px-4 py-2 font-medium">Gebeurtenis</th>
              <th className="px-4 py-2 font-medium">Ontvangers</th>
              <th className="px-4 py-2 font-medium">Kanalen</th>
              <th className="px-4 py-2 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {CONFIGURABLE_NOTIFICATION_TYPES.map((type: ConfigurableNotificationType) => {
              const row = byType.get(type);
              if (!row) return null;
              return (
                <NotificationRuleRow key={type} type={type} initial={row} isRoleBased={ROLE_BASED_NOTIFICATION_TYPES.includes(type)} />
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default async function BeheerCommunicatiePage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  await requireBoard();
  const { tab } = await searchParams;
  const activeTab: TabKey = TABS.some((t) => t.key === tab) ? (tab as TabKey) : "nieuwsbrieven";

  return (
    <div className="flex flex-col gap-4">
      <PageHeader title="Nieuwsbrieven" description="Nieuwsbrieven en notificatieregels op één plek." />

      <div className="flex gap-1.5 overflow-x-auto">
        {TABS.map((t) => (
          <Chip
            key={t.key}
            href={t.key === "nieuwsbrieven" ? "/beheer/communicatie" : `/beheer/communicatie?tab=${t.key}`}
            active={activeTab === t.key}
          >
            <t.icon size={14} />
            {t.label}
          </Chip>
        ))}
      </div>

      {activeTab === "nieuwsbrieven" && <NieuwsbrievenTab />}
      {activeTab === "notificatieregels" && <NotificatieregelsTab />}
    </div>
  );
}
