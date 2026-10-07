import type { Metadata } from "next";
import { UserPlus } from "lucide-react";
import { requireBoard } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { ComingSoon } from "@/components/ui/ComingSoon";
import { PageHeader } from "@/components/ui/PageHeader";
import { AccessRequestRow, type AccessRequest } from "@/components/invitations/AccessRequestRow";

export const metadata: Metadata = { title: "Toegangsaanvragen" };

export default async function AanvragenPage() {
  await requireBoard();
  const supabase = await createClient();

  const { data: requests } = await supabase
    .from("access_requests")
    .select("*")
    .eq("status", "pending")
    .order("created_at", { ascending: false })
    .returns<AccessRequest[]>();

  return (
    <div>
      <PageHeader
        title="Toegangsaanvragen"
        description="Mensen die via het inlogscherm of het aanmeldformulier om toegang hebben gevraagd. Nodig ze direct uit — naam, bedrijf en adres worden overgenomen in de uitnodiging."
      />

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
    </div>
  );
}
