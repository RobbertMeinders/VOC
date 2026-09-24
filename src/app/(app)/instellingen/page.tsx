import type { Metadata } from "next";
import { Download } from "lucide-react";
import { requireProfile } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { PushToggle } from "@/components/profile/PushToggle";
import { ThemeToggle } from "@/components/profile/ThemeToggle";
import { AttendedActivitiesToggle } from "@/components/profile/AttendedActivitiesToggle";
import { ShowContactToggle } from "@/components/profile/ShowContactToggle";
import { PushCategoryToggle } from "@/components/profile/PushCategoryToggle";
import { ShowAddressToggle } from "@/components/company/ShowAddressToggle";
import { SettingRow } from "@/components/ui/SettingRow";

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

      <SettingRow label="Pushmeldingen" description="Ontvang een melding op dit apparaat bij nieuwe activiteit.">
        <PushToggle />
      </SettingRow>

      <SettingRow
        label="Activiteiten"
        description="Nieuwe activiteiten, herinneringen en promotie van de wachtlijst."
      >
        <PushCategoryToggle category="activities" initialEnabled={profile.push_activities} />
      </SettingRow>

      <SettingRow label="Reacties en vermeldingen" description="Reacties op je berichten en @vermeldingen in de feed.">
        <PushCategoryToggle category="feed" initialEnabled={profile.push_feed} />
      </SettingRow>

      <SettingRow label="Nieuwe leden" description="Melding zodra een nieuw lid zich aansluit.">
        <PushCategoryToggle category="new_members" initialEnabled={profile.push_new_members} />
      </SettingRow>

      <SettingRow
        label="Bijgewoonde evenementen tonen"
        description={
          <>
            <p>Zichtbaar voor andere leden op je profiel.</p>
            <p className="mt-0.5">
              Let op: jijzelf en bestuur/beheer zien dit onderdeel altijd op je profiel, ongeacht deze instelling —
              deze schakelaar verbergt het alleen voor overige leden.
            </p>
          </>
        }
      >
        <AttendedActivitiesToggle initialVisible={data?.show_attended_activities ?? true} />
      </SettingRow>

      <SettingRow label="Telefoonnummer tonen" description="Zichtbaar voor andere leden op je profiel.">
        <ShowContactToggle field="phone" initialVisible={profile.show_phone} />
      </SettingRow>

      <SettingRow label="E-mailadres tonen" description="Zichtbaar voor andere leden op je profiel.">
        <ShowContactToggle field="email" initialVisible={profile.show_email} />
      </SettingRow>

      {company?.address && (
        <SettingRow
          label="Bezoekersadres bedrijf tonen"
          description="Verbergt het adres van je bedrijf op de bedrijfspagina en op de kaart — handig als hier een privéadres staat."
        >
          <ShowAddressToggle companyId={company.id} initialVisible={company.show_address} />
        </SettingRow>
      )}

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
    </div>
  );
}
