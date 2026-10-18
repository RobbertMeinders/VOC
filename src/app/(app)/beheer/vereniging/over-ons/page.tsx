import type { Metadata } from "next";
import { requireBoard } from "@/lib/auth/session";
import { getOrgProfile } from "@/lib/settings/org-profile";
import { PageHeader } from "@/components/ui/PageHeader";
import { OrgProfileForm } from "@/components/beheer/OrgProfileForm";

export const metadata: Metadata = { title: "Over VOC" };

export default async function OverVocAdminPage() {
  await requireBoard();
  const orgProfile = await getOrgProfile();

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="Over VOC"
        description="Inhoud voor de pagina Over VOC die leden via Vereniging in de hoofdnavigatie bereiken. Leeg laten betekent: dit onderdeel staat nog niet op de pagina."
      />
      <OrgProfileForm orgProfile={orgProfile} />
    </div>
  );
}
