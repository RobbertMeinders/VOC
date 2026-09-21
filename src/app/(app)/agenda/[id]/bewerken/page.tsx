import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireBoard } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { getSignedStorageUrl, getSignedStorageUrls } from "@/lib/supabase/storage";
import { ActivityForm } from "@/components/agenda/ActivityForm";
import { ActivityAttachmentRow } from "@/components/agenda/ActivityAttachmentRow";
import { ActivityAttachmentUploadForm } from "@/components/agenda/ActivityAttachmentUploadForm";
import { updateActivityAction } from "@/app/(app)/agenda/actions";
import type { Database } from "@/lib/types/database";

type Activity = Database["public"]["Tables"]["activities"]["Row"];
type Attachment = Database["public"]["Tables"]["activity_attachments"]["Row"];

export const metadata: Metadata = { title: "Activiteit bewerken" };

export default async function EditActivityPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await requireBoard();
  const supabase = await createClient();

  const [{ data: activity }, { data: attachments }] = await Promise.all([
    supabase.from("activities").select("*").eq("id", id).maybeSingle<Activity>(),
    supabase
      .from("activity_attachments")
      .select("*")
      .eq("activity_id", id)
      .order("created_at", { ascending: true })
      .returns<Attachment[]>(),
  ]);
  if (!activity) {
    notFound();
  }

  const [imageUrl, attachmentUrls] = await Promise.all([
    getSignedStorageUrl("activity-images", activity.image_url),
    getSignedStorageUrls(supabase, "activity-attachments", (attachments ?? []).map((a) => a.storage_path)),
  ]);
  const updateWithId = updateActivityAction.bind(null, id);

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-semibold text-foreground">Activiteit bewerken</h1>
      <div className="rounded-2xl border border-border bg-surface p-6 shadow-sm">
        <ActivityForm activity={activity} action={updateWithId} submitLabel="Opslaan" imageUrl={imageUrl} showTypePicker />
      </div>

      <div className="rounded-2xl border border-border bg-surface p-6 shadow-sm">
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
