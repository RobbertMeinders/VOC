import type { Metadata } from "next";
import { requireBoard } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { getAppSettings } from "@/lib/settings/app-settings";
import { PageHeader } from "@/components/ui/PageHeader";
import { AppSettingsForm } from "@/components/beheer/AppSettingsForm";
import { ForceLogoutAllButton } from "@/components/beheer/ForceLogoutAllButton";
import { NotificationRuleRow } from "@/components/beheer/NotificationRuleRow";
import { AllNotificationChannelsSwitch } from "@/components/beheer/AllNotificationChannelsSwitch";
import { CONFIGURABLE_NOTIFICATION_TYPES, ROLE_BASED_NOTIFICATION_TYPES, type ConfigurableNotificationType } from "@/lib/notifications/type-labels";
import type { Database } from "@/lib/types/database";

export const metadata: Metadata = { title: "Portaalinstellingen" };

// B4 (nieuwsbriefsysteem-plan): Notificatieregels verhuisd van Beheer ->
// Nieuwsbrieven hierheen — gaat over automatische meldingen, niet over
// nieuwsbrieven. Was board-toegankelijk (bestuurslid + beheerder) en blijft
// dat; de rest van deze pagina (naam/logo, "Gevaarlijke acties") is en
// blijft beheerder-only, dus de pagina zelf vraagt nu alleen requireBoard()
// en gate't de beheerder-only secties zelf op profile.role.
export default async function AppSettingsPage() {
  const profile = await requireBoard();
  const isAdmin = profile.role === "beheerder";
  const supabase = await createClient();

  const [settings, { data: notificationRows }] = await Promise.all([
    getAppSettings(),
    supabase.from("notification_type_settings").select("*").returns<Database["public"]["Tables"]["notification_type_settings"]["Row"][]>(),
  ]);
  const byType = new Map((notificationRows ?? []).map((row) => [row.type, row]));
  const anyRuleEnabled = (notificationRows ?? []).some((row) => row.enabled);

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="Portaalinstellingen"
        description="Naam, logo, verenigingsnaam en notificatieregels van het ledenportaal."
      />

      {isAdmin && <AppSettingsForm settings={settings} />}

      <div className="rounded-2xl border border-border bg-surface p-6 shadow-sm">
        <h2 className="mb-1 text-sm font-semibold text-foreground">Notificatieregels</h2>
        <p className="mb-4 text-xs text-muted">
          Per type melding: welke rollen &apos;m krijgen (voor de types die naar bestuur/beheer gaan), via welke kanalen, en of de regel aan
          staat. Persoonlijke voorkeuren van leden zelf (zie Instellingen) blijven hier bovenop gelden.
        </p>
        <div className="flex flex-col gap-4">
          <AllNotificationChannelsSwitch initialEnabled={anyRuleEnabled} />
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
                  // key op updated_at (i.p.v. alleen type): na de hoofdschakelaar
                  // hierboven krijgt elke rij een nieuwe updated_at, wat deze rij
                  // laat remounten met de verse initial-waarden i.p.v. de eigen,
                  // inmiddels verouderde lokale state te laten staan.
                  return (
                    <NotificationRuleRow
                      key={`${type}-${row.updated_at}`}
                      type={type}
                      initial={row}
                      isRoleBased={ROLE_BASED_NOTIFICATION_TYPES.includes(type)}
                    />
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {isAdmin && (
        // Een los lid uitloggen staat bij dat lid zelf (Leden -> lid ->
        // Beheer) — hier alleen de ingreep die alle leden tegelijk raakt.
        <div className="rounded-2xl border border-border bg-surface p-6 shadow-sm">
          <h2 className="mb-1 text-sm font-semibold text-foreground">Gevaarlijke acties</h2>
          <p className="mb-4 text-xs text-muted">Alleen voor een vermoede gelekte sessie of ander beveiligingsincident.</p>
          <ForceLogoutAllButton />
        </div>
      )}
    </div>
  );
}
