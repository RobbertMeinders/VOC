import type { Metadata } from "next";
import { UserSearch } from "lucide-react";
import { requireBoard } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { ComingSoon } from "@/components/ui/ComingSoon";
import { BackLink } from "@/components/ui/BackLink";
import { ProspectRow, type Prospect } from "@/components/beheer/ProspectRow";

export const metadata: Metadata = { title: "Potentiële leden" };

export default async function ProspectsPage() {
  await requireBoard();
  const supabase = await createClient();

  const { data: prospects } = await supabase
    .from("prospects")
    .select("*")
    .order("last_seen_at", { ascending: false })
    .returns<Prospect[]>();

  return (
    <div>
      <BackLink href="/beheer" label="Terug naar Beheer" />
      <h1 className="mb-1 text-xl font-semibold text-foreground">Potentiële leden</h1>
      <p className="mb-6 text-sm text-muted">
        Niet-leden die zich via de openbare agenda-embed hebben aangemeld voor een activiteit. Wordt automatisch
        bijgewerkt bij elke nieuwe aanmelding en na 90 dagen zonder nieuwe aanmelding automatisch verwijderd.
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
