"use server";

import { revalidatePath } from "next/cache";
import { requireBoard } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

export async function markAccessRequestHandledAction(id: string) {
  await requireBoard();
  const supabase = await createClient();
  await supabase.from("access_requests").update({ status: "handled" }).eq("id", id);
  revalidatePath("/beheer/aanvragen");
}
