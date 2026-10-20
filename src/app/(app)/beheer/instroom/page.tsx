import type { Metadata } from "next";
import { Clock, Inbox, UserPlus, UserSearch, Upload } from "lucide-react";
import { requireBoard } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/ui/PageHeader";
import { Chip } from "@/components/ui/Chip";
import { ComingSoon } from "@/components/ui/ComingSoon";
import { AccessRequestRow, type AccessRequest } from "@/components/invitations/AccessRequestRow";
import { InviteForm } from "@/components/invitations/InviteForm";
import { InvitationList, type Invitation } from "@/components/invitations/InvitationList";
import { ProspectRow, type Prospect } from "@/components/beheer/ProspectRow";
import { BulkImportForm } from "@/components/invitations/BulkImportForm";
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
    <div>
      <PageHeader title="Aanvragen" />

      {/* sticky: blijft in beeld bij scrollen door een lange lijst (zelfde als
          /beheer/bedrijven). top-14 op mobiel (onder de mobiele header), top-0
          op desktop (geen vaste header daar). */}
      <div className="sticky top-14 z-10 -mx-4 mb-4 flex gap-1.5 overflow-x-auto bg-background px-4 py-2 md:top-0 md:-mx-16 md:px-16">
        {TABS.map((t) => (
          <Chip
            key={t.key}
            href={t.key === "aanvragen" ? "/beheer/instroom" : `/beheer/instroom?tab=${t.key}`}
            active={activeTab === t.key}
          >
            <t.icon size={14} />
            {t.label}
          </Chip>
        ))}
      </div>

      {activeTab === "aanvragen" && (
        <>
          {/* UX-audit F3: geschiedenis van afgehandelde aanvragen — tot nu
              toe verdwenen die simpelweg uit beeld na accepteren/afwijzen. */}
          <div className="mb-3 flex gap-1.5">
            <Chip href="/beheer/instroom" active={requestStatus === "pending"}>
              Openstaand
            </Chip>
            <Chip href="/beheer/instroom?tab=aanvragen&status=afgehandeld" active={requestStatus === "handled"}>
              Afgehandeld
            </Chip>
          </div>
          <AanvragenTab status={requestStatus} />
        </>
      )}
      {activeTab === "uitnodigingen" && <UitnodigingenTab canInviteBoard={profile.role === "beheerder"} />}
      {activeTab === "prospects" && <ProspectsTab />}
      {activeTab === "import" && <ImportTab />}
    </div>
  );
}
