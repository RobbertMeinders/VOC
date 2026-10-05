import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireBoard } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { DeleteButton } from "@/components/feed/DeleteButton";
import { deleteCommunicationAction } from "../actions";

export const metadata: Metadata = { title: "Nieuwsbrief" };

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("nl-NL", { day: "numeric", month: "long", year: "numeric" });
}

export default async function CommunicatieDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await requireBoard();
  const { id } = await params;
  const supabase = await createClient();

  const { data: communication } = await supabase.from("communications").select("*").eq("id", id).maybeSingle();

  if (!communication) {
    notFound();
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-foreground">{communication.subject}</h1>
          {communication.preheader && <p className="mt-0.5 text-sm text-muted">{communication.preheader}</p>}
          <p className="mt-1 text-xs text-muted">Aangemaakt op {formatDate(communication.created_at)}</p>
        </div>
        {communication.status !== "verzonden" && (
          <DeleteButton
            confirmMessage={`Weet je zeker dat je "${communication.subject}" wilt verwijderen?`}
            onDelete={deleteCommunicationAction.bind(null, communication.id)}
          />
        )}
      </div>

      <div className="rounded-2xl border border-dashed border-border bg-surface p-5 text-sm text-muted shadow-sm">
        De blokkeneditor (tekst, afbeelding, evenement, knop, scheidingslijn) volgt in de volgende fase van de
        communicatiemodule. Dit concept staat al wel klaar in de database.
      </div>
    </div>
  );
}
