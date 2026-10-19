import type { Metadata } from "next";
import { Users, List as ListIcon } from "lucide-react";
import { requireBoard } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/ui/PageHeader";
import { Chip } from "@/components/ui/Chip";
import { ContactenContent } from "@/components/beheer/ContactenContent";

export const metadata: Metadata = { title: "Contacten & lijsten" };

const TABS = [
  { key: "contacten", label: "Contacten", icon: Users },
  { key: "lijsten", label: "Lijsten", icon: ListIcon },
] as const;
type TabKey = (typeof TABS)[number]["key"];

// Eigen menu-item (N6, nieuwsbriefsysteem-plan) voor wat eerder alleen via
// een klein knopje op de nieuwsbrievenpagina te vinden was
// ("/beheer/communicatie/doelgroepen") — contactpersonen zonder account en
// herbruikbare lijsten, voor de doelgroep-kiezer op een campagne
// (NewsletterEditor). Alle tabellen zijn klein genoeg (zelfde schaalaanname
// als elders, bv. Statistieken) om in één keer op te halen en client-side
// te filteren/koppelen, i.p.v. per lijst een aparte members-query te doen.
export default async function ContactenPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  await requireBoard();
  const { tab } = await searchParams;
  const activeTab: TabKey = TABS.some((t) => t.key === tab) ? (tab as TabKey) : "contacten";
  const supabase = await createClient();

  const [{ data: contacts }, { data: lists }, { data: listProfiles }, { data: listContacts }, { data: activeProfiles }] =
    await Promise.all([
      supabase.from("contacts").select("*").order("name"),
      supabase.from("contact_lists").select("*").order("name"),
      supabase.from("contact_list_profiles").select("list_id, profile_id"),
      supabase.from("contact_list_contacts").select("list_id, contact_id"),
      supabase.from("profiles").select("id, first_name, last_name").eq("is_active", true).order("first_name"),
    ]);

  return (
    <div className="flex flex-col gap-4">
      <PageHeader title="Contacten & lijsten" description="Externe contactpersonen zonder account en herbruikbare lijsten voor nieuwsbrieven." />

      <div className="flex gap-1.5 overflow-x-auto">
        {TABS.map((t) => (
          <Chip key={t.key} href={t.key === "contacten" ? "/beheer/contacten" : `/beheer/contacten?tab=${t.key}`} active={activeTab === t.key}>
            <t.icon size={14} />
            {t.label}
          </Chip>
        ))}
      </div>

      <ContactenContent
        activeTab={activeTab}
        contacts={contacts ?? []}
        lists={lists ?? []}
        listProfiles={listProfiles ?? []}
        listContacts={listContacts ?? []}
        activeProfiles={activeProfiles ?? []}
      />
    </div>
  );
}
