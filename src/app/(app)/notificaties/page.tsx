import type { Metadata } from "next";
import { Bell } from "lucide-react";
import { requireProfile } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { ComingSoon } from "@/components/ui/ComingSoon";
import { NotificationList } from "@/components/notifications/NotificationList";
import type { Database } from "@/lib/types/database";

export const metadata: Metadata = { title: "Notificaties" };

type Notification = Database["public"]["Tables"]["notifications"]["Row"];

export default async function NotificatiesPage() {
  const profile = await requireProfile();
  const supabase = await createClient();

  const { data: notifications } = await supabase
    .from("notifications")
    .select("*")
    .eq("profile_id", profile.id)
    .order("created_at", { ascending: false })
    .limit(50)
    .returns<Notification[]>();

  return (
    <div>
      <h1 className="mb-4 text-xl font-semibold text-foreground">Notificaties</h1>

      {notifications && notifications.length > 0 ? (
        <NotificationList notifications={notifications} />
      ) : (
        <ComingSoon
          icon={Bell}
          title="Geen notificaties"
          description="Hier verschijnen meldingen zodra er iets voor je gebeurt."
        />
      )}
    </div>
  );
}
