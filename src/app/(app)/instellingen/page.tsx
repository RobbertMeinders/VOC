import type { Metadata } from "next";
import { Download } from "lucide-react";
import { requireProfile } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { PushToggle } from "@/components/profile/PushToggle";
import { ThemeToggle } from "@/components/profile/ThemeToggle";
import { AttendedActivitiesToggle } from "@/components/profile/AttendedActivitiesToggle";
import { ShowContactToggle } from "@/components/profile/ShowContactToggle";
import { NotificationCategoryToggle } from "@/components/profile/NotificationCategoryToggle";
import { ShowAddressToggle } from "@/components/company/ShowAddressToggle";
import { DeleteAccountButton } from "@/components/profile/DeleteAccountButton";
import { SettingRow } from "@/components/ui/SettingRow";
import { SettingGroup, SettingSubRow } from "@/components/ui/SettingGroup";

export const metadata: Metadata = { title: "Instellingen" };

type Membership = { company: { id: string; address: string | null; show_address: boolean } | null };

export default async function InstellingenPage() {
  const profile = await requireProfile();
  const supabase = await createClient();

  const [{ data }, { data: membership }] = await Promise.all([
    supabase.from("profiles").select("show_attended_activities").eq("id", profile.id).single(),
    supabase
      .from("company_members")
      .select("company:companies(id, address, show_address)")
      .eq("profile_id", profile.id)
      .limit(1)
      .maybeSingle()
      .returns<Membership>(),
  ]);
  const company = membership?.company ?? null;

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-semibold text-foreground">Instellingen</h1>

      <SettingRow label="Thema" description="Licht, donker of volgens de instelling van je apparaat.">
        <ThemeToggle />
      </SettingRow>

      <SettingGroup label="Pushmeldingen" description="Ontvang een melding op dit apparaat. Per soort melding los aan of uit te zetten.">
        <SettingSubRow label="Dit apparaat">
          <PushToggle />
        </SettingSubRow>

        <SettingSubRow label="Activiteiten">
          <NotificationCategoryToggle channel="push" category="activities" initialEnabled={profile.push_activities} />
        </SettingSubRow>

        <SettingSubRow label="Reacties en vermeldingen">
          <NotificationCategoryToggle channel="push" category="feed" initialEnabled={profile.push_feed} />
        </SettingSubRow>

        <SettingSubRow label="Nieuwe leden">
          <NotificationCategoryToggle channel="push" category="new_members" initialEnabled={profile.push_new_members} />
        </SettingSubRow>
      </SettingGroup>

      <SettingGroup label="E-mailmeldingen" description="Ontvang een melding per e-mail. Per soort melding los aan of uit te zetten.">
        <SettingSubRow label="Activiteiten">
          <NotificationCategoryToggle channel="email" category="activities" initialEnabled={profile.email_activities} />
        </SettingSubRow>

        <SettingSubRow label="Reacties en vermeldingen">
          <NotificationCategoryToggle channel="email" category="feed" initialEnabled={profile.email_feed} />
        </SettingSubRow>

        <SettingSubRow label="Nieuwe leden">
          <NotificationCategoryToggle channel="email" category="new_members" initialEnabled={profile.email_new_members} />
        </SettingSubRow>
      </SettingGroup>

      <SettingGroup label="Privacy" description="Zichtbaar voor andere leden op je profiel of de bedrijfspagina.">
        <SettingSubRow label="E-mailadres tonen">
          <ShowContactToggle field="email" initialVisible={profile.show_email} />
        </SettingSubRow>

        <SettingSubRow label="Telefoonnummer tonen">
          <ShowContactToggle field="phone" initialVisible={profile.show_phone} />
        </SettingSubRow>

        <SettingSubRow label="Bijgewoonde evenementen tonen">
          <AttendedActivitiesToggle initialVisible={data?.show_attended_activities ?? true} />
        </SettingSubRow>

        {company?.address && (
          <SettingSubRow label="Bezoekersadres bedrijf tonen">
            <ShowAddressToggle companyId={company.id} initialVisible={company.show_address} />
          </SettingSubRow>
        )}
      </SettingGroup>

      <SettingRow
        label="Mijn gegevens downloaden"
        description="Een bestand met je profielgegevens, geplaatste berichten/reacties en activiteit-aanmeldingen."
      >
        <a
          href="/api/profiel/export"
          download
          className="flex items-center gap-1.5 rounded-full border border-border bg-surface px-3 py-1.5 text-sm font-medium text-foreground hover:border-voc-red hover:text-voc-red"
        >
          <Download size={14} />
          Downloaden
        </a>
      </SettingRow>

      <div className="rounded-2xl border border-voc-red/30 bg-surface p-6 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
          <div className="min-w-0">
            <p className="text-sm font-medium text-foreground">Account verwijderen</p>
            <p className="mt-0.5 text-xs text-muted">
              Je account wordt direct gedeactiveerd; persoonsgegevens worden na 90 dagen automatisch gewist.
              Geplaatste berichten en reacties blijven staan.
            </p>
          </div>
          <div className="shrink-0">
            <DeleteAccountButton />
          </div>
        </div>
      </div>
    </div>
  );
}
