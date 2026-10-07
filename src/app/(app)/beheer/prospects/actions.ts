"use server";

import { revalidatePath } from "next/cache";
import { requireBoard } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/types/database";

export type ProspectStatus = Database["public"]["Tables"]["prospects"]["Row"]["status"];

export async function updateProspectStatusAction(prospectId: string, status: ProspectStatus): Promise<{ error?: string }> {
  const board = await requireBoard();
  const supabase = await createClient();

  const { error } = await supabase
    .from("prospects")
    .update({ status, status_updated_at: new Date().toISOString(), status_updated_by: board.id })
    .eq("id", prospectId);

  if (error) {
    return { error: "Wijzigen is niet gelukt. Probeer het opnieuw." };
  }
  revalidatePath("/beheer/instroom");
  return {};
}

export async function deleteProspectAction(prospectId: string): Promise<void> {
  await requireBoard();
  const supabase = await createClient();

  await supabase.from("prospects").delete().eq("id", prospectId);
  revalidatePath("/beheer/instroom");
}
