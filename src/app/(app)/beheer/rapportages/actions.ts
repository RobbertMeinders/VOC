"use server";

import { revalidatePath } from "next/cache";
import { requireBoard } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

// Verwijderen van het gerapporteerde bericht markeert de rapportage meteen
// als afgehandeld (cascade via post_id zou de rij zelf verwijderen — dat
// zou het overzicht van "wat is er ooit gerapporteerd" verliezen, dus
// bewust eerst de rapportage bijwerken vóór het bericht weg is).
export async function resolveReportAction(reportId: string, decision: "deleted" | "dismissed", postId: string) {
  await requireBoard();
  const supabase = await createClient();

  await supabase.from("feed_post_reports").update({ status: "afgehandeld" }).eq("id", reportId);

  if (decision === "deleted") {
    await supabase.from("feed_posts").delete().eq("id", postId);
  }

  revalidatePath("/beheer/rapportages");
}
