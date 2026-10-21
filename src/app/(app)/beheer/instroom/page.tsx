import type { Metadata } from "next";
import { Building2, Clock, Inbox, UserPlus, UserSearch, Upload } from "lucide-react";
import { requireBoard } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/ui/PageHeader";
import { QueryTabs } from "@/components/ui/QueryTabs";
import { TabNavProvider } from "@/lib/ui/TabNavContext";
import { TabContentArea } from "@/components/ui/TabContentArea";
import { ComingSoon } from "@/components/ui/ComingSoon";
import { AccessRequestRow, type AccessRequest } from "@/components/invitations/AccessRequestRow";
import { InviteForm } from "@/components/invitations/InviteForm";
import { InvitationList, type Invitation } from "@/components/invitations/InvitationList";
import { ProspectRow, type Prospect } from "@/components/beheer/ProspectRow";
import { BulkImportForm } from "@/components/invitations/BulkImportForm";
import { CompanyMembershipRequestRow, type CompanyMembershipRequestItem } from "@/components/beheer/CompanyMembershipRequestRow";
import { extendAllInvitationsAction } from "@/app/(app)/beheer/uitnodigingen/actions";

export const metadata: Metadata = { title: "Aanvragen" };

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
  { key: "koppelingen", label: "Bedrijfskoppelingen", icon: Building2 },
  { key: "uitnodigingen", label: "Uitnodigingen", icon: UserPlus },
  { key: "prospects", label: "Potentiële leden", icon: UserSearch },
  { key: "import", label: "Importeren", icon: Upload },
] as const;
type TabKey = (typeof TABS)[number]["key"];

// UX-audit F3: "afgewezen" bestaat niet als eigen statuswaarde (zowel
// Accepteren als Afwijzen zetten status op 'handled', zie
// markAccessRequestHandledAction/createInvitationFromAccessRequestAction) —
// hier daarom achteraf afgeleid uit of er inmiddels een uitnodiging met
// hetzelfde e-mailadres bestaat (dan geaccepteerd), zonder dat daar een
// eigen kolom/migratie voor nodig is.
async function AanvragenTab({ status }: { status: "pending" | "handled" }) {
  const supabase = await createClient();
  const { data: requests } = await supabase
    .from("access_requests")
    .select("*")
    .eq("status", status)
    .order("created_at", { ascending: false })
    .returns<AccessRequest[]>();

  if (status === "handled") {
    const emails = (requests ?? []).map((r) => r.email.toLowerCase());
    const { data: invitations } =
      emails.length > 0 ? await supabase.from("invitations").select("email").in("email", emails) : { data: [] };
    const acceptedEmails = new Set(
      (invitations ?? []).filter((i): i is { email: string } => Boolean(i.email)).map((i) => i.email.toLowerCase())
    );

    return (
      <div className="rounded-2xl bg-surface p-4 shadow-sm">
        {requests && requests.length > 0 ? (
          requests.map((request) => (
            <AccessRequestRow
              key={request.id}
              request={request}
              outcome={acceptedEmails.has(request.email.toLowerCase()) ? "accepted" : "rejected"}
            />
          ))
        ) : (
          <ComingSoon icon={Clock} title="Nog geen afgehandelde aanvragen" description="Aanvragen die je accepteert of afwijst, komen hier terecht." />
        )}
      </div>
    );
  }

  return (
    <div className="rounded-2xl bg-surface p-4 shadow-sm">
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

// Koppelverzoeken onder Aanvragen (relayed opdracht): voorheen alleen af te
// handelen op het dashboard ("Wacht op jou") en op de bedrijfspagina zelf —
// ze gaan over lidmaatschap, dus horen hier thuis, naast de toegangsaanvragen.
// Zelfde "pending"/"afgehandeld"-status-param en FK-kwalificatie (profile_id
// vs. decided_by, zie foutenrapport §0) als elders.
async function KoppelingenTab({ status }: { status: "pending" | "handled" }) {
  const supabase = await createClient();
  type RequestQueryRow = {
    id: string;
    requested_at: string;
    decided_at: string | null;
    decision_reason: string | null;
    status: "pending" | "approved" | "rejected";
    company: { id: string; slug: string; name: string } | null;
    profile: { id: string; slug: string; first_name: string; last_name: string } | null;
    decided_by_profile: { first_name: string; last_name: string } | null;
  };

  const query = supabase
    .from("company_membership_requests")
    .select(
      "id, requested_at, decided_at, decision_reason, status, company:companies(id, slug, name), profile:profiles!company_membership_requests_profile_id_fkey(id, slug, first_name, last_name), decided_by_profile:profiles!company_membership_requests_decided_by_fkey(first_name, last_name)"
    )
    .order(status === "pending" ? "requested_at" : "decided_at", { ascending: false });

  const { data: rows } = await (status === "pending" ? query.eq("status", "pending") : query.in("status", ["approved", "rejected"])).returns<
    RequestQueryRow[]
  >();

  const requests: (CompanyMembershipRequestItem & { status: RequestQueryRow["status"] })[] = (rows ?? [])
    .filter((r): r is RequestQueryRow & { company: { id: string; slug: string; name: string }; profile: { id: string; slug: string; first_name: string; last_name: string } } =>
      r.company !== null && r.profile !== null
    )
    .map((r) => ({
      id: r.id,
      requestedAt: r.requested_at,
      decidedAt: r.decided_at,
      decisionReason: r.decision_reason,
      decidedBy: r.decided_by_profile,
      company: r.company,
      profile: r.profile,
      status: r.status,
    }));

  if (status === "handled") {
    return (
      <div className="rounded-2xl bg-surface p-4 shadow-sm">
        {requests.length > 0 ? (
          requests.map((request) => (
            <CompanyMembershipRequestRow
              key={request.id}
              request={request}
              outcome={request.status === "approved" ? "approved" : "rejected"}
            />
          ))
        ) : (
          <ComingSoon icon={Clock} title="Nog geen afgehandelde koppelverzoeken" description="Verzoeken die je goedkeurt of afwijst, komen hier terecht." />
        )}
      </div>
    );
  }

  return (
    <div className="rounded-2xl bg-surface p-4 shadow-sm">
      {requests.length > 0 ? (
        requests.map((request) => <CompanyMembershipRequestRow key={request.id} request={request} />)
      ) : (
        <ComingSoon icon={Building2} title="Geen openstaande koppelverzoeken" description="Een lid dat zich aan een bestaand bedrijf koppelt, verschijnt hier." />
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
      <div className="rounded-2xl bg-surface p-4 shadow-sm">
        <InviteForm canInviteBoard={canInviteBoard} />
      </div>

      <div className="rounded-2xl bg-surface p-4 shadow-sm">
        <div className="mb-2 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-sm font-semibold text-foreground">Openstaande uitnodigingen</h2>
          {(allInvitations?.length ?? 0) > 0 && (
            <form action={extendAllInvitationsAction}>
              <button
                type="submit"
                className="flex shrink-0 items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-xs font-medium text-foreground hover:bg-black/[.04] dark:hover:bg-white/[.06]"
              >
                <Clock size={14} />
                Alles verlengen
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
      <p className="text-sm text-muted">Neem contact op en werk daarna de status bij.</p>
      <div className="rounded-2xl bg-surface p-4 shadow-sm">
        {prospects && prospects.length > 0 ? (
          prospects.map((prospect) => <ProspectRow key={prospect.id} prospect={prospect} />)
        ) : (
          <ComingSoon
            icon={UserSearch}
            title="Nog geen potentiële leden"
            description="Niet-leden die zich via de website aanmelden voor een activiteit, verschijnen hier."
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
        Per rij wordt een uitnodiging gemaakt, nog zonder e-mail. Die verstuur je later bij Uitnodigingen.
      </p>
      <BulkImportForm />
    </div>
  );
}

export default async function InstroomPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; status?: string }>;
}) {
  const profile = await requireBoard();
  const { tab, status } = await searchParams;
  const activeTab: TabKey = TABS.some((t) => t.key === tab) ? (tab as TabKey) : "aanvragen";
  const requestStatus: "pending" | "handled" = status === "afgehandeld" ? "handled" : "pending";

  return (
    <TabNavProvider>
      <div>
      <PageHeader title="Aanvragen" />

      {/* sticky: blijft in beeld bij scrollen door een lange lijst (zelfde als
          /beheer/bedrijven). top-14 op mobiel (onder de mobiele header), top-0
          op desktop (geen vaste header daar). */}
      <div className="sticky top-14 z-10 -mx-4 mb-4 flex gap-1.5 overflow-x-auto bg-background px-4 py-2 md:top-0 md:-mx-16 md:px-16">
        <QueryTabs
          active={activeTab}
          tabs={TABS.map((t) => ({
            key: t.key,
            href: t.key === "aanvragen" ? "/beheer/instroom" : `/beheer/instroom?tab=${t.key}`,
            label: (
              <>
                <t.icon size={14} />
                {t.label}
              </>
            ),
          }))}
        />
      </div>

      <TabContentArea>
      {activeTab === "aanvragen" && (
        <>
          {/* UX-audit F3: geschiedenis van afgehandelde aanvragen — tot nu
              toe verdwenen die simpelweg uit beeld na accepteren/afwijzen. */}
          <div className="mb-3 flex gap-1.5">
            <QueryTabs
              active={requestStatus}
              tabs={[
                { key: "pending", href: "/beheer/instroom", label: "Openstaand" },
                { key: "handled", href: "/beheer/instroom?tab=aanvragen&status=afgehandeld", label: "Afgehandeld" },
              ]}
            />
          </div>
          <AanvragenTab status={requestStatus} />
        </>
      )}
      {activeTab === "koppelingen" && (
        <>
          <div className="mb-3 flex gap-1.5">
            <QueryTabs
              active={requestStatus}
              tabs={[
                { key: "pending", href: "/beheer/instroom?tab=koppelingen", label: "Openstaand" },
                { key: "handled", href: "/beheer/instroom?tab=koppelingen&status=afgehandeld", label: "Afgehandeld" },
              ]}
            />
          </div>
          <KoppelingenTab status={requestStatus} />
        </>
      )}
      {activeTab === "uitnodigingen" && <UitnodigingenTab canInviteBoard={profile.role === "beheerder"} />}
      {activeTab === "prospects" && <ProspectsTab />}
      {activeTab === "import" && <ImportTab />}
      </TabContentArea>
      </div>
    </TabNavProvider>
  );
}
