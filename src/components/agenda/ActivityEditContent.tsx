import { notFound, permanentRedirect } from "next/navigation";
import { requireBoard } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { getSignedStorageUrl, getSignedStorageUrls } from "@/lib/supabase/storage";
import { ActivityForm } from "@/components/agenda/ActivityForm";
import { ActivityAttachmentRow } from "@/components/agenda/ActivityAttachmentRow";
import { ActivityAttachmentUploadForm } from "@/components/agenda/ActivityAttachmentUploadForm";
import { updateActivityAction } from "@/app/(app)/agenda/actions";
import { activityHref, activityIdFilter, resolveActivitySlugAlias } from "@/lib/agenda/slug";
import type { Database } from "@/lib/types/database";

type Activity = Database["public"]["Tables"]["activities"]["Row"];
type Attachment = Database["public"]["Tables"]["activity_attachments"]["Row"];

// Gedeeld tussen de volledige pagina (/agenda/[id]/bewerken) en de
// intercepted overlay (@modal/(.)agenda/[id]/bewerken). `id` is de
// route-waarde (titel-slug of, voor oudere links, een kaal UUID) — zie
// lib/agenda/slug.ts.
export async function ActivityEditContent({ id: routeParam }: { id: string }) {
  await requireBoard();
  const supabase = await createClient();

  const { data: activity } = await supabase
    .from("activities")
    .select("*")
    .filter(...activityIdFilter(routeParam))
    .maybeSingle<Activity>();
  if (!activity) {
    // URL-ronde #100: zie ActivityDetailContent — een gemiste match kan een
    // inmiddels verouderde slug zijn (activity_slug_aliases, migratie 0155).
    const currentSlug = await resolveActivitySlugAlias(supabase, routeParam);
    if (currentSlug) {
      permanentRedirect(activityHref({ slug: currentSlug }, "/bewerken"));
    }
    notFound();
  }
  if (routeParam !== activity.slug) {
    permanentRedirect(activityHref(activity, "/bewerken"));
  }

  const [imageUrl, { data: attachments }] = await Promise.all([
    getSignedStorageUrl("activity-images", activity.image_url),
    supabase
      .from("activity_attachments")
      .select("*")
      .eq("activity_id", activity.id)
      .order("created_at", { ascending: true })
      .returns<Attachment[]>(),
  ]);
  const attachmentUrls = await getSignedStorageUrls(supabase, "activity-attachments", (attachments ?? []).map((a) => a.storage_path));
  const updateWithId = updateActivityAction.bind(null, activity.id);

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-semibold text-foreground">Activiteit bewerken</h1>
      <div className="rounded-2xl bg-surface p-6 shadow-sm">
        <ActivityForm activity={activity} action={updateWithId} submitLabel="Opslaan" imageUrl={imageUrl} showTypePicker />
      </div>

      <div className="rounded-2xl bg-surface p-6 shadow-sm">
        <h2 className="mb-3 text-sm font-semibold text-foreground">Bijlagen</h2>
        {(attachments ?? []).length > 0 && (
          <div className="mb-3 flex flex-col gap-2">
            {(attachments ?? []).map((attachment) => (
              <ActivityAttachmentRow
                key={attachment.id}
                attachment={attachment}
                url={attachmentUrls.get(attachment.storage_path) ?? null}
                canManage
              />
            ))}
          </div>
        )}
        <ActivityAttachmentUploadForm activityId={activity.id} />
      </div>
    </div>
  );
}
