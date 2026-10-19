import type { Metadata } from "next";
import { Bell } from "lucide-react";
import { requireProfile } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { ComingSoon } from "@/components/ui/ComingSoon";
import { NotificationList } from "@/components/notifications/NotificationList";
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
      <h1 className="mb-4 font-display text-[1.75rem] font-extrabold tracking-[-0.03em] text-foreground sm:text-[2rem]">Meldingen</h1>

      {notifications && notifications.length > 0 ? (
        <NotificationList notifications={notifications} />
      ) : (
        <ComingSoon
          icon={Bell}
          title="Je hebt geen nieuwe meldingen."
        />
      )}
    </div>
  );
}
