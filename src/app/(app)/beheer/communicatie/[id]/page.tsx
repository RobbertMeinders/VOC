import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireBoard } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { DeleteButton } from "@/components/feed/DeleteButton";
import { NewsletterEditor } from "@/components/beheer/NewsletterEditor";
import { deleteCommunicationAction } from "../actions";

export const metadata: Metadata = { title: "Nieuwsbrief" };

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
          <p className="mt-0.5 text-xs text-muted">
            {communication.status === "verzonden" ? "Verzonden — alleen-lezen" : "Concept"}
          </p>
        </div>
        {communication.status !== "verzonden" && (
          <DeleteButton
            confirmMessage={`Weet je zeker dat je "${communication.subject}" wilt verwijderen?`}
            onDelete={deleteCommunicationAction.bind(null, communication.id)}
          />
        )}
      </div>

      <NewsletterEditor communication={communication} />
    </div>
  );
}
