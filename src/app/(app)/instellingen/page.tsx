import type { Metadata } from "next";
import { requireProfile } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { PushToggle } from "@/components/profile/PushToggle";
import { ThemeToggle } from "@/components/profile/ThemeToggle";
import { AttendedActivitiesToggle } from "@/components/profile/AttendedActivitiesToggle";

export const metadata: Metadata = { title: "Instellingen" };

export default async function InstellingenPage() {
  const profile = await requireProfile();
  const supabase = await createClient();

  const { data } = await supabase
    .from("profiles")
    .select("show_attended_activities")
    .eq("id", profile.id)
    .single();

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-semibold text-foreground">Instellingen</h1>

      <div className="rounded-2xl border border-border bg-surface p-6 shadow-sm">
        <p className="mb-2 text-sm font-medium text-foreground">Thema</p>
        <ThemeToggle />
      </div>

      <div className="rounded-2xl border border-border bg-surface p-6 shadow-sm">
        <p className="mb-2 text-sm font-medium text-foreground">Pushmeldingen</p>
        <PushToggle />
      </div>

      <div className="rounded-2xl border border-border bg-surface p-6 shadow-sm">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-foreground">Bijgewoonde evenementen tonen</p>
            <p className="mt-0.5 text-xs text-muted">
              Aan: je bijgewoonde evenementen zijn zichtbaar op je profiel voor andere leden. Uit: dit
              onderdeel wordt niet aan andere leden getoond.
            </p>
          </div>
          <AttendedActivitiesToggle initialVisible={data?.show_attended_activities ?? true} />
        </div>
      </div>
    </div>
  );
}
