import type { Metadata } from "next";
import { requireBoard } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { InviteForm } from "@/components/invitations/InviteForm";
import { InvitationList, type Invitation } from "@/components/invitations/InvitationList";

export const metadata: Metadata = { title: "Uitnodigingen" };

export default async function UitnodigingenPage() {
  const profile = await requireBoard();
  const supabase = await createClient();

  const { data: invitations } = await supabase
    .from("invitations")
    .select("*")
    .eq("status", "pending")
    .order("created_at", { ascending: false })
    .returns<Invitation[]>();

  return (
    <div>
      <Breadcrumbs items={[{ label: "Beheer", href: "/beheer" }, { label: "Uitnodigingen" }]} />
      <h1 className="mb-1 text-xl font-semibold text-foreground">Uitnodigingen</h1>
      <p className="mb-6 text-sm text-muted">
        Nodig nieuwe leden uit voor het ledenportaal. Vul een e-mailadres in om de uitnodiging
        automatisch te versturen, of laat het leeg en deel de link zelf.
      </p>

      <div className="rounded-2xl border border-border bg-surface p-4 shadow-sm">
        <InviteForm canInviteBoard={profile.role === "beheerder"} />
      </div>

      <div className="mt-6 rounded-2xl border border-border bg-surface p-4 shadow-sm">
        <h2 className="mb-2 text-sm font-semibold text-foreground">Openstaande uitnodigingen</h2>
        <InvitationList invitations={invitations ?? []} />
      </div>
    </div>
  );
}
