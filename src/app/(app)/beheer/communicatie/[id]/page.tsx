import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireBoard } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { DeleteButton } from "@/components/feed/DeleteButton";
import { PageHeader } from "@/components/ui/PageHeader";
import { NewsletterEditor } from "@/components/beheer/NewsletterEditor";
import { getAppSettings } from "@/lib/settings/app-settings";
import { previewNewsletterRecipients } from "@/lib/newsletter/recipients";
import { deleteCommunicationAction } from "../actions";
import type { Database } from "@/lib/types/database";

type Delivery = Database["public"]["Tables"]["communication_deliveries"]["Row"];
type SendAttempt = Database["public"]["Tables"]["communication_send_attempts"]["Row"];

export const metadata: Metadata = { title: "Nieuwsbrief" };

// sendNewsletterAction (aangeroepen vanaf deze pagina) loopt sequentieel
// over elke ontvanger — ruim boven de standaard functietijd bij een
// ledenaantal dat nog kan groeien. Slechts het zelf opgegeven maximum;
// Vercel knipt een deployment nog steeds af op het plafond van het eigen
// abonnement.
export const maxDuration = 300;

export default async function CommunicatieDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  await requireBoard();
  const { id } = await params;
  const { tab } = await searchParams;
  const initialTab = tab === "ontvangers" || tab === "verzendingen" ? tab : undefined;
  const supabase = await createClient();

  const nowIso = new Date().toISOString();
  // Voor de Evenement-blok-kiezer in de editor — eerst de eerstvolgende
  // aankomende activiteit (meest relevant om over te communiceren), dan de
  // meest recent verlopen. Eén "order by starts_at desc"-query zou juist de
  // verst-in-de-toekomst liggende activiteit bovenaan zetten, dus twee
  // losse, tegengesteld gesorteerde queries i.p.v. één.
  const [
    { data: communication },
    { data: upcomingActivities },
    { data: pastActivities },
    { count: activeMemberCount },
    settings,
    { data: lists },
    { data: contacts },
    { data: activeProfiles },
    { data: selectedLists },
    { data: selectedProfiles },
    { data: selectedContacts },
    { data: deliveries },
    { data: attempts },
    { data: allProfileNames },
  ] = await Promise.all([
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
    supabase.from("contact_lists").select("id, name").order("name"),
    supabase.from("contacts").select("id, name, email").order("name"),
    supabase.from("profiles").select("id, first_name, last_name").eq("is_active", true).order("first_name"),
    supabase.from("communication_recipient_lists").select("list_id").eq("communication_id", id),
    supabase.from("communication_recipient_profiles").select("profile_id").eq("communication_id", id),
    supabase.from("communication_recipient_contacts").select("contact_id").eq("communication_id", id),
    supabase
      .from("communication_deliveries")
      .select("*")
      .eq("communication_id", id)
      .order("created_at", { ascending: true })
      .returns<Delivery[]>(),
    supabase
      .from("communication_send_attempts")
      .select("*")
      .eq("communication_id", id)
      .order("started_at", { ascending: false })
      .returns<SendAttempt[]>(),
    // Niet alleen actieve leden: een verzendregel kan ook een inmiddels
    // gedeactiveerd lid betreffen (verstuurd toen het account nog actief
    // was) — zonder naam zou die rij "Onbekend" tonen in Verzendingen.
    supabase.from("profiles").select("id, first_name, last_name"),
  ]);
  const activities = [...(upcomingActivities ?? []), ...(pastActivities ?? [])];

  if (!communication) {
    notFound();
  }

  // Echte aantal ontvangers voor de bevestiging bij "Versturen" (N4) — zie
  // previewNewsletterRecipients voor de aannames (nog geen ontdubbeling
  // leden/contacten, dat is N5).
  const recipientPreview = await previewNewsletterRecipients(supabase, communication);

  // B1/N5: komt nu uit de verzendregels-tabel i.p.v. losse tellingen op
  // notifications (leden) en communication_contact_sends (contacten) —
  // die twee tellen niet meer mee voor nieuwe verzendingen (zie send.ts).
  const allDeliveries = deliveries ?? [];
  const sentCount = allDeliveries.filter((d) => d.status === "verstuurd" || d.status === "overgeslagen").length;
  const failedCount = allDeliveries.filter((d) => d.status === "mislukt").length;

  const profileNames: Record<string, string> = {};
  for (const p of allProfileNames ?? []) profileNames[p.id] = `${p.first_name} ${p.last_name}`.trim();
  const recipientNames: Record<string, string> = { ...profileNames };
  for (const c of contacts ?? []) recipientNames[c.id] = c.name;

  // 'versturen' had hiervoor geen eigen label en viel terug op "Concept" —
  // verwarrend bij een vastgelopen verzending (bug uit de analyse: de
  // detailpagina toonde "Concept" terwijl er feitelijk nog iets vastzat).
  const statusLabel =
    communication.status === "verzonden"
      ? "Verstuurd"
      : communication.status === "verzenden_mislukt"
        ? "Deels verstuurd"
        : communication.status === "ingepland"
          ? "Ingepland"
          : communication.status === "versturen"
            ? "Versturen…"
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
        failedCount={failedCount}
        orgName={settings.org_name}
        logoUrl={settings.logo_url}
        lists={lists ?? []}
        contacts={contacts ?? []}
        activeProfiles={activeProfiles ?? []}
        selectedListIds={(selectedLists ?? []).map((l) => l.list_id)}
        extraProfileIds={(selectedProfiles ?? []).map((p) => p.profile_id)}
        extraContactIds={(selectedContacts ?? []).map((c) => c.contact_id)}
        recipientPreview={recipientPreview}
        deliveries={allDeliveries}
        attempts={attempts ?? []}
        recipientNames={recipientNames}
        attemptStarterNames={profileNames}
        initialTab={initialTab}
      />
    </div>
  );
}
