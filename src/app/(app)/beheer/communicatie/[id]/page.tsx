import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireBoard } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { DeleteButton } from "@/components/feed/DeleteButton";
import { PageHeader } from "@/components/ui/PageHeader";
import { NewsletterEditor } from "@/components/beheer/NewsletterEditor";
import { getAppSettings } from "@/lib/settings/app-settings";
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
  const [{ data: communication }, { data: upcomingActivities }, { data: pastActivities }, { count: activeMemberCount }, settings] =
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
      getAppSettings(),
    ]);
  const activities = [...(upcomingActivities ?? []), ...(pastActivities ?? [])];

  if (!communication) {
    notFound();
  }

  // Alleen relevant na een (eventueel gedeeltelijk mislukte) verzendpoging
  // — bij een concept of een nog niet opgepakte planning is er nog niets
  // geclaimd, dus geen zinvolle telling.
  let sentCount = 0;
  if (communication.status === "verzonden" || communication.status === "verzenden_mislukt") {
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
        : communication.status === "ingepland"
          ? "Ingepland"
          : "Concept";

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title={communication.subject}
        description={statusLabel}
        back={{ href: "/beheer/communicatie", label: "Terug naar nieuwsbrieven" }}
        action={
          communication.status !== "verzonden" && (
            <DeleteButton
              confirmMessage={`Weet je zeker dat je "${communication.subject}" wilt verwijderen?`}
              onDelete={deleteCommunicationAction.bind(null, communication.id)}
            />
          )
        }
      />

      <NewsletterEditor
        communication={communication}
        activities={activities}
        activeMemberCount={activeMemberCount ?? 0}
        sentCount={sentCount}
        orgName={settings.org_name}
        logoUrl={settings.logo_url}
      />
    </div>
  );
}
