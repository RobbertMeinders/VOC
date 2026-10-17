import type { Metadata } from "next";
import { requireBoard } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/ui/PageHeader";
import { DoelgroepenContent } from "@/components/beheer/DoelgroepenContent";

export const metadata: Metadata = { title: "Doelgroepen" };

// Contactpersonen zonder account + herbruikbare lijsten, voor de
// doelgroep-kiezer op een nieuwsbriefcampagne (NewsletterEditor) — zie
// 0089_newsletter_audience_targeting.sql. Alle tabellen zijn klein genoeg
// (zelfde schaalaanname als elders, bv. Statistieken) om in één keer op te
// halen en client-side te filteren/koppelen, i.p.v. per lijst een aparte
// members-query te doen.
export default async function DoelgroepenPage() {
  await requireBoard();
  const supabase = await createClient();

  const [{ data: contacts }, { data: lists }, { data: listProfiles }, { data: listContacts }, { data: activeProfiles }] =
    await Promise.all([
      supabase.from("contacts").select("*").order("name"),
      supabase.from("contact_lists").select("*").order("name"),
      supabase.from("contact_list_profiles").select("list_id, profile_id"),
      supabase.from("contact_list_contacts").select("list_id, contact_id"),
      supabase.from("profiles").select("id, first_name, last_name, email").eq("is_active", true).order("first_name"),
    ]);

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="Doelgroepen"
        description="Contactpersonen zonder account en herbruikbare lijsten voor nieuwsbriefcampagnes."
        back={{ href: "/beheer/communicatie", label: "Terug naar nieuwsbrieven" }}
      />
      <DoelgroepenContent
        contacts={contacts ?? []}
        lists={lists ?? []}
        listProfiles={listProfiles ?? []}
        listContacts={listContacts ?? []}
        activeProfiles={activeProfiles ?? []}
      />
    </div>
  );
}
