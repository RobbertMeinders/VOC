import type { Metadata } from "next";
import Link from "next/link";
import { Download, KeyRound, ShieldCheck } from "lucide-react";
import { requireProfile } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { PushToggle } from "@/components/profile/PushToggle";
import { ThemeToggle } from "@/components/profile/ThemeToggle";
import { AttendedActivitiesToggle } from "@/components/profile/AttendedActivitiesToggle";
import { ShowContactToggle } from "@/components/profile/ShowContactToggle";
import { NotificationChannelChoice } from "@/components/profile/NotificationChannelChoice";
import { EmailCampaignsToggle } from "@/components/profile/EmailCampaignsToggle";
import { EmailChangeForm } from "@/components/profile/EmailChangeForm";
import { ShowAddressToggle } from "@/components/company/ShowAddressToggle";
import { PubliclyVisibleToggle } from "@/components/profile/PubliclyVisibleToggle";
import { DeleteAccountButton } from "@/components/profile/DeleteAccountButton";
import { SettingRow } from "@/components/ui/SettingRow";
import { SettingGroup, SettingSubRow } from "@/components/ui/SettingGroup";
import { PageHeader } from "@/components/ui/PageHeader";

export const metadata: Metadata = { title: "Instellingen" };

type Membership = {
  company: { id: string; address: string | null; show_address: boolean } | null;
};

export default async function InstellingenPage() {
  const profile = await requireProfile();
  const supabase = await createClient();

  const [{ data }, { data: membership }] = await Promise.all([
    supabase
      .from("profiles")
      .select(
        "show_attended_activities, publicly_visible, email_campaigns, email_digest_new_activity, email_digest_feed_comment, email_digest_feed_mention"
      )
      .eq("id", profile.id)
      .single(),
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
      <PageHeader title="Instellingen" />

      <SettingRow label="Thema" description="Licht, donker of volgens de instelling van je apparaat.">
        <ThemeToggle />
      </SettingRow>

      {/* UX-review punt 10: e-mailadres wijzigen stond los op /profiel, los
          van wachtwoord hier — twee plekken voor "accountgegevens
          wijzigen". Beide nu samen onder Account. */}
      <SettingGroup label="Account" description="Een wachtwoord is optioneel: je kunt ook inloggen met een link per e-mail.">
        <SettingSubRow label="Wachtwoord">
          <Link
            href="/wachtwoord-instellen"
            className="flex items-center gap-1.5 rounded-full border border-border bg-surface px-3 py-1.5 text-sm font-medium text-foreground hover:border-muted hover:text-foreground"
          >
            <KeyRound size={14} />
            Wijzigen
          </Link>
        </SettingSubRow>
        <SettingSubRow label="E-mailadres">
          <EmailChangeForm currentEmail={profile.email} />
        </SettingSubRow>
      </SettingGroup>

      <SettingGroup label="Meldingen" description="Berichten over je eigen aanvragen krijg je altijd.">

        <SettingSubRow label="Dit apparaat">
          <PushToggle />
        </SettingSubRow>

        <SettingSubRow label="Nieuwsbrieven">
          <EmailCampaignsToggle initialEnabled={data?.email_campaigns ?? true} />
        </SettingSubRow>

        {/* Geen SettingSubRow hier: die dwingt de waarde in een smalle kolom
            rechts van het label, en 4 opties passen daar op mobiel niet
            naast elkaar (brak eerder lelijk af over 2-3 regels). Op mobiel
            staat het label daarom boven en krijgt de keuze de volle breedte;
            vanaf sm: weer naast elkaar, net als de andere rijen. Na de twee
            schakelaars hierboven i.p.v. ertussen: scheidt de simpele
            aan/uit-rijen van de pil-keuzes, oogt rustiger dan afwisselen.
            Meldingensysteem-overhaul Fase 3: vier losse types i.p.v. twee
            brede categorieën ("Activiteiten"/"Reacties en vermeldingen") —
            new_activity en activity_reminder, en feed_comment en
            feed_mention, konden tot nu toe niet los ingesteld worden. */}
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
          <span className="text-sm text-foreground">Nieuwe activiteiten</span>
          <NotificationChannelChoice
            type="new_activity"
            initialPush={profile.push_new_activity}
            initialEmail={profile.email_new_activity}
            digest={{ type: "new_activity", initialDigest: data?.email_digest_new_activity ?? false }}
          />
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
          <span className="text-sm text-foreground">Herinnering voor een activiteit</span>
          <NotificationChannelChoice type="activity_reminder" initialPush={profile.push_activity_reminder} initialEmail={profile.email_activity_reminder} />
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
          <span className="text-sm text-foreground">Reacties op je berichten</span>
          <NotificationChannelChoice
            type="feed_comment"
            initialPush={profile.push_feed_comment}
            initialEmail={profile.email_feed_comment}
            digest={{ type: "feed_comment", initialDigest: data?.email_digest_feed_comment ?? false }}
          />
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
          <span className="text-sm text-foreground">Als iemand je @vermeldt</span>
          <NotificationChannelChoice
            type="feed_mention"
            initialPush={profile.push_feed_mention}
            initialEmail={profile.email_feed_mention}
            digest={{ type: "feed_mention", initialDigest: data?.email_digest_feed_mention ?? false }}
          />
        </div>
      </SettingGroup>

      <SettingGroup label="Privacy" description="Zichtbaar voor andere leden op je profiel of de bedrijfspagina.">
        <SettingSubRow label="E-mailadres tonen">
          <ShowContactToggle field="email" initialVisible={profile.show_email} />
        </SettingSubRow>

        <SettingSubRow label="Telefoonnummer tonen">
          <ShowContactToggle field="phone" initialVisible={profile.show_phone} />
        </SettingSubRow>

        <SettingSubRow label="Bijgewoonde activiteiten tonen">
          <AttendedActivitiesToggle initialVisible={data?.show_attended_activities ?? true} />
        </SettingSubRow>

        {company?.address && (
          <SettingSubRow label="Bezoekadres bedrijf tonen">
            <ShowAddressToggle companyId={company.id} initialVisible={company.show_address} />
          </SettingSubRow>
        )}

        {company && (
          <SettingSubRow label="Naam en functie tonen op bedrijvengids">
            <PubliclyVisibleToggle initialVisible={data?.publicly_visible ?? false} />
          </SettingSubRow>
        )}

        <SettingSubRow label="Privacyverklaring">
          <Link
            href="/privacy"
            className="flex items-center gap-1.5 rounded-full border border-border bg-surface px-3 py-1.5 text-sm font-medium text-foreground hover:border-muted hover:text-foreground"
          >
            <ShieldCheck size={14} />
            Bekijken
          </Link>
        </SettingSubRow>
      </SettingGroup>

      <SettingRow
        label="Mijn gegevens downloaden"
        description="Een bestand met je profielgegevens, geplaatste berichten/reacties en activiteit-aanmeldingen."
      >
        <a
          href="/api/profiel/export"
          download
          className="flex items-center gap-1.5 rounded-full border border-border bg-surface px-3 py-1.5 text-sm font-medium text-foreground hover:border-muted hover:text-foreground"
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
