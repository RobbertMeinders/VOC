import type { Metadata } from "next";
import { requireAdmin } from "@/lib/auth/session";
import { PageHeader } from "@/components/ui/PageHeader";
import { ThumbnailBackfillContent } from "@/components/beheer/ThumbnailBackfillContent";

export const metadata: Metadata = { title: "Kleine versies" };

// Eenmalige backfill-tool: de thumbnail-kolommen (avatar_thumb_url,
// logo_thumb_url, image_thumb_url, feed_attachments.thumb_path) werken al
// voor nieuwe uploads, maar bestaande rijen van vóór die functionaliteit
// vallen nog terug op het volledige origineel. Draait client-side (browser
// van de beheerder) zodat er geen sharp/image-optimizer nodig is op Vercel —
// zie ThumbnailBackfillContent voor de volledige toelichting.
export default async function ThumbnailsBackfillPage() {
  await requireAdmin();

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="Kleine versies"
        description="Eenmalige backfill: maakt alsnog een kleine versie (thumbnail) van bestaande foto's die er nog geen hebben. Originelen blijven altijd staan."
      />
      <ThumbnailBackfillContent />
    </div>
  );
}
