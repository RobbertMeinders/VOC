import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireBoard } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { getSignedStorageUrl } from "@/lib/supabase/storage";
import { ActivityForm } from "@/components/agenda/ActivityForm";
import { updateActivityAction } from "@/app/(app)/agenda/actions";
import type { Database } from "@/lib/types/database";

type Activity = Database["public"]["Tables"]["activities"]["Row"];

export const metadata: Metadata = { title: "Activiteit bewerken" };

export default async function EditActivityPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await requireBoard();
  const supabase = await createClient();

  const { data: activity } = await supabase.from("activities").select("*").eq("id", id).maybeSingle<Activity>();
  if (!activity) {
    notFound();
  }

  const imageUrl = await getSignedStorageUrl("activity-images", activity.image_url);
  const updateWithId = updateActivityAction.bind(null, id);

  return (
    <div>
      <h1 className="mb-4 text-xl font-semibold text-foreground">Activiteit bewerken</h1>
      <div className="rounded-2xl border border-border bg-surface p-6 shadow-sm">
        <ActivityForm activity={activity} action={updateWithId} submitLabel="Opslaan" imageUrl={imageUrl} />
      </div>
    </div>
  );
}
