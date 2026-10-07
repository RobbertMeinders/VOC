import type { Metadata } from "next";
import Link from "next/link";
import { clsx } from "clsx";
import { Clock, Inbox, UserPlus, UserSearch, Upload } from "lucide-react";
import { requireBoard } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/ui/PageHeader";
import { ComingSoon } from "@/components/ui/ComingSoon";
import { AccessRequestRow, type AccessRequest } from "@/components/invitations/AccessRequestRow";
import { InviteForm } from "@/components/invitations/InviteForm";
import { InvitationList, type Invitation } from "@/components/invitations/InvitationList";
import { ProspectRow, type Prospect } from "@/components/beheer/ProspectRow";
import { BulkImportForm } from "@/components/invitations/BulkImportForm";
import { extendAllInvitationsAction } from "@/app/(app)/beheer/uitnodigingen/actions";

export const metadata: Metadata = { title: "Instroom" };

// Leden importeren (tab "import") geocodeert elk nieuw bedrijf sequentieel,
// zie leden-import/actions.ts — geldt voor de hele route, niet alleen die tab.
export const maxDuration = 300;

// UX-review Deel 5: dit was vier losse menu-items (Toegangsaanvragen,
// Uitnodigingen, Potentiële leden, Leden importeren) voor hetzelfde proces
// — iemand wordt lid — waardoor je tussen vier schermen wisselde om één
// persoon te volgen. Nu tabs op één pagina; elke tab doet verder precies
// wat de losse pagina deed (zelfde queries/componenten), alleen de
// oude route-bestanden (aanvragen/uitnodigingen/prospects/leden-import)
// redirecten nu hierheen i.p.v. zelf te renderen.
const TABS = [
  { key: "aanvragen", label: "Aanvragen", icon: Inbox },
  { key: "uitnodigingen", label: "Uitnodigingen", icon: UserPlus },
  { key: "prospects", label: "Potentiële leden", icon: UserSearch },
  { key: "import", label: "Importeren", icon: Upload },
] as const;
type TabKey = (typeof TABS)[number]["key"];

async function AanvragenTab() {
  const supabase = await createClient();
  const { data: requests } = await supabase
    .from("access_requests")
    .select("*")
    .eq("status", "pending")
    .order("created_at", { ascending: false })
    .returns<AccessRequest[]>();

  return (
    <div className="rounded-2xl border border-border bg-surface p-4 shadow-sm">
      {requests && requests.length > 0 ? (
        requests.map((request) => <AccessRequestRow key={request.id} request={request} />)
      ) : (
        <ComingSoon
          icon={UserPlus}
          title="Geen openstaande aanvragen"
          description="Nieuwe aanvragen vanuit het inlogscherm verschijnen hier."
        />
      )}
    </div>
  );
}

async function UitnodigingenTab({ canInviteBoard }: { canInviteBoard: boolean }) {
  const supabase = await createClient();
  // Zoeken filtert client-side (InvitationList) — "Verleng alle met 14
  // dagen" werkt bewust op alle openstaande uitnodigingen, niet alleen de
  // gefilterde.
  const { data: allInvitations } = await supabase
    .from("invitations")
    .select("*, company:companies(name)")
    .eq("status", "pending")
    .order("created_at", { ascending: false })
    .returns<Invitation[]>();

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-2xl border border-border bg-surface p-4 shadow-sm">
        <InviteForm canInviteBoard={canInviteBoard} />
      </div>

      <div className="rounded-2xl border border-border bg-surface p-4 shadow-sm">
        <div className="mb-2 flex items-center justify-between gap-3">
          <h2 className="text-sm font-semibold text-foreground">Openstaande uitnodigingen</h2>
          {(allInvitations?.length ?? 0) > 0 && (
            <form action={extendAllInvitationsAction}>
              <button
                type="submit"
                className="flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-xs font-medium text-foreground hover:bg-black/[.04] dark:hover:bg-white/[.06]"
              >
                <Clock size={14} />
                Verleng alle met 14 dagen
              </button>
            </form>
          )}
        </div>
        <InvitationList invitations={allInvitations ?? []} />
      </div>
    </div>
  );
}

async function ProspectsTab() {
  const supabase = await createClient();
  const { data: prospects } = await supabase
    .from("prospects")
    .select("*")
    .order("last_seen_at", { ascending: false })
    .returns<Prospect[]>();

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-muted">
        Gebruik het e-mailadres om zelf contact op te nemen (bijv. na de activiteit, of om te vragen of diegene lid
        wil worden), en zet daarna de status: <span className="text-foreground">Wil lid worden</span> als iemand
        toegevoegd moet worden (via de tab Uitnodigingen hiernaast), <span className="text-foreground">Wil niet lid worden</span>{" "}
        of <span className="text-foreground">Geen antwoord</span> om af te sluiten. Met het prullenbakje kun je een
        rij ook direct verwijderen, bijvoorbeeld bij een verkeerd ingevuld e-mailadres.
      </p>
      <div className="rounded-2xl border border-border bg-surface p-4 shadow-sm">
        {prospects && prospects.length > 0 ? (
          prospects.map((prospect) => <ProspectRow key={prospect.id} prospect={prospect} />)
        ) : (
          <ComingSoon
            icon={UserSearch}
            title="Nog geen potentiële leden"
            description="Zodra een niet-lid zich via de openbare agenda-embed aanmeldt voor een activiteit, verschijnt die hier."
          />
        )}
      </div>
    </div>
  );
}

function ImportTab() {
  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-muted">
        Upload een CSV-bestand met bestaande ledengegevens (voornaam, achternaam, e-mail, telefoon, bedrijf,
        bezoekersadres, postcode, vestigingsplaats). Er wordt per rij een uitnodiging aangemaakt — zonder dat daar
        meteen een e-mail bij verstuurd wordt; een bedrijf dat nog niet bestaat wordt automatisch aangemaakt met het
        opgegeven adres. Bekijk en pas de gegevens hieronder aan voordat je importeert; de e-mail versturen doe je
        later, per lid, vanaf de tab Uitnodigingen.
      </p>
      <BulkImportForm />
    </div>
  );
}

export default async function InstroomPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const profile = await requireBoard();
  const { tab } = await searchParams;
  const activeTab: TabKey = TABS.some((t) => t.key === tab) ? (tab as TabKey) : "aanvragen";

  return (
    <div>
      <PageHeader
        title="Instroom"
        description="Van toegangsaanvraag of activiteit-aanmelding tot lid — op één plek i.p.v. verspreid over vier schermen."
      />

      <div className="mb-4 flex gap-1.5 overflow-x-auto">
        {TABS.map((t) => (
          <Link
            key={t.key}
            href={t.key === "aanvragen" ? "/beheer/instroom" : `/beheer/instroom?tab=${t.key}`}
            className={clsx(
              "flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium",
              activeTab === t.key ? "bg-voc-red text-white" : "bg-black/[.06] text-muted dark:bg-white/[.08]"
            )}
          >
            <t.icon size={14} />
            {t.label}
          </Link>
        ))}
      </div>

      {activeTab === "aanvragen" && <AanvragenTab />}
      {activeTab === "uitnodigingen" && <UitnodigingenTab canInviteBoard={profile.role === "beheerder"} />}
      {activeTab === "prospects" && <ProspectsTab />}
      {activeTab === "import" && <ImportTab />}
    </div>
  );
}
