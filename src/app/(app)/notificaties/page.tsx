import type { Metadata } from "next";
import { Bell } from "lucide-react";
import { requireProfile } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { ComingSoon } from "@/components/ui/ComingSoon";
import { NotificationList } from "@/components/notifications/NotificationList";
import { PageHeader } from "@/components/ui/PageHeader";
import type { Database } from "@/lib/types/database";

export const metadata: Metadata = { title: "Meldingen" };

type Notification = Database["public"]["Tables"]["notifications"]["Row"];

export default async function NotificatiesPage() {
  const profile = await requireProfile();
  const supabase = await createClient();

  // type 'newsletter' uitsluiten: die rijen zijn puur verzendadministratie
  // voor de nieuwsbrief (zie 0067_newsletter_send.sql), nooit bedoeld om
  // hier te verschijnen — een lid leest de inhoud al via e-mail zelf.
  const { data: notifications } = await supabase
    .from("notifications")
    .select("*")
    .eq("profile_id", profile.id)
    .eq("channel_inapp_allowed", true)
    .neq("type", "newsletter")
    .order("created_at", { ascending: false })
    .limit(50)
    .returns<Notification[]>();

  return (
    <div>
      <PageHeader title="Meldingen" />

      {/* F1 (UX-audit): emptyState i.p.v. hier zelf op de server-opgehaalde
          lengte te beslissen — anders blijft deze lege-staat na het
          wegvegen/verwijderen van de laatste melding ten onrechte weg (zie
          NotificationList voor de volledige toelichting). */}
      <NotificationList
        notifications={notifications ?? []}
        emptyState={<ComingSoon icon={Bell} title="Je hebt geen nieuwe meldingen." />}
      />
    </div>
  );
}
