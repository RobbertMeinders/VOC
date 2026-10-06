import { Suspense } from "react";
import type { Metadata } from "next";
import { Clock } from "lucide-react";
import { requireBoard } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { InviteForm } from "@/components/invitations/InviteForm";
import { InvitationList, type Invitation } from "@/components/invitations/InvitationList";
import { DocumentSearch } from "@/components/documents/DocumentSearch";
import { extendAllInvitationsAction } from "./actions";

export const metadata: Metadata = { title: "Uitnodigingen" };

export default async function UitnodigingenPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const profile = await requireBoard();
  const { q } = await searchParams;
  const supabase = await createClient();

  const { data: allInvitations } = await supabase
    .from("invitations")
    .select("*")
    .eq("status", "pending")
    .order("created_at", { ascending: false })
    .returns<Invitation[]>();

  // "Verleng alle met 14 dagen" hieronder werkt bewust op alle openstaande
  // uitnodigingen, niet alleen de gefilterde — zoeken is puur om deze lange
  // (bv. bulk-geïmporteerde) lijst terug te vinden, niet om de bulkactie te
  // beperken.
  const query = (q ?? "").trim().toLowerCase();
  const invitations = query
    ? (allInvitations ?? []).filter((i) =>
        `${i.first_name ?? ""} ${i.last_name ?? ""} ${i.email ?? ""}`.toLowerCase().includes(query)
      )
    : allInvitations;

  return (
    <div>
      <h1 className="mb-1 text-xl font-semibold text-foreground">Uitnodigingen</h1>
      <p className="mb-6 text-sm text-muted">
        Nodig nieuwe leden uit voor het ledenportaal. Vul een e-mailadres in om de uitnodiging
        automatisch te versturen, of laat het leeg en deel de link zelf.
      </p>

      <div className="rounded-2xl border border-border bg-surface p-4 shadow-sm">
        <InviteForm canInviteBoard={profile.role === "beheerder"} />
      </div>

      <div className="mt-6 rounded-2xl border border-border bg-surface p-4 shadow-sm">
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

        {(allInvitations?.length ?? 0) > 0 && (
          <Suspense>
            <DocumentSearch placeholder="Zoek op naam of e-mailadres…" />
          </Suspense>
        )}

        {query && invitations?.length === 0 ? (
          <p className="text-sm text-muted">Geen uitnodigingen gevonden.</p>
        ) : (
          <InvitationList invitations={invitations ?? []} />
        )}
      </div>
    </div>
  );
}
