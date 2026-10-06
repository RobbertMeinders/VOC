import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireBoard } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { DeleteButton } from "@/components/feed/DeleteButton";
import { NewsletterEditor } from "@/components/beheer/NewsletterEditor";
import { deleteCommunicationAction } from "../actions";

export const metadata: Metadata = { title: "Campagne" };

// sendNewsletterAction (aangeroepen vanaf deze pagina) loopt sequentieel
// over elke ontvanger — ruim boven de standaard functietijd bij een
// ledenaantal dat nog kan groeien. Slechts het zelf opgegeven maximum;
// Vercel knipt een deployment nog steeds af op het plafond van het eigen
// abonnement.
export const maxDuration = 300;

export default async function CommunicatieDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await requireBoard();
  const { id } = await params;
  const supabase = await createClient();

  const nowIso = new Date().toISOString();
  // Voor de Evenement-blok-kiezer in de editor — eerst de eerstvolgende
  // aankomende activiteit (meest relevant om over te communiceren), dan de
  // meest recent verlopen. Eén "order by starts_at desc"-query zou juist de
  // verst-in-de-toekomst liggende activiteit bovenaan zetten, dus twee
  // losse, tegengesteld gesorteerde queries i.p.v. één.
  const [{ data: communication }, { data: upcomingActivities }, { data: pastActivities }, { count: activeMemberCount }] =
    await Promise.all([
      supabase.from("communications").select("*").eq("id", id).maybeSingle(),
      supabase
        .from("activities")
        .select("id, title, starts_at")
        .eq("status", "approved")
        .gte("starts_at", nowIso)
        .order("starts_at", { ascending: true })
        .limit(50),
      supabase
        .from("activities")
        .select("id, title, starts_at")
        .eq("status", "approved")
        .lt("starts_at", nowIso)
        .order("starts_at", { ascending: false })
        .limit(50),
      supabase.from("profiles").select("id", { count: "exact", head: true }).eq("is_active", true),
    ]);
  const activities = [...(upcomingActivities ?? []), ...(pastActivities ?? [])];

  if (!communication) {
    notFound();
  }

  // Alleen relevant na een (eventueel gedeeltelijk mislukte) verzendpoging
  // — bij een concept is er nog niets geclaimd, dus geen zinvolle telling.
  let sentCount = 0;
  if (communication.status !== "concept") {
    const { count } = await supabase
      .from("notifications")
      .select("id", { count: "exact", head: true })
      .eq("communication_id", communication.id)
      .not("emailed_at", "is", null);
    sentCount = count ?? 0;
  }

  const statusLabel =
    communication.status === "verzonden"
      ? "Verzonden — alleen-lezen"
      : communication.status === "verzenden_mislukt"
        ? "Verzenden gedeeltelijk mislukt"
        : "Concept";

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-foreground">{communication.subject}</h1>
          <p className="mt-0.5 text-xs text-muted">{statusLabel}</p>
        </div>
        {communication.status !== "verzonden" && (
          <DeleteButton
            confirmMessage={`Weet je zeker dat je "${communication.subject}" wilt verwijderen?`}
            onDelete={deleteCommunicationAction.bind(null, communication.id)}
          />
        )}
      </div>

      <NewsletterEditor
        communication={communication}
        activities={activities}
        activeMemberCount={activeMemberCount ?? 0}
        sentCount={sentCount}
      />
    </div>
  );
}
