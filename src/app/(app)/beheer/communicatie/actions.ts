"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireBoard } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { logAuditAction } from "@/lib/audit/log";

// next/navigation's redirect() throws internally to unwind the render; that
// throw must always be allowed through, never caught as a "real" error.
function isNextRedirectError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "digest" in error &&
    typeof (error as { digest?: unknown }).digest === "string" &&
    (error as { digest: string }).digest.startsWith("NEXT_REDIRECT")
  );
}

export async function createCommunicationAction(): Promise<void> {
  const profile = await requireBoard();
  const supabase = await createClient();

  try {
    const { data: communication, error } = await supabase
      .from("communications")
      .insert({ subject: "Nieuwe nieuwsbrief", created_by: profile.id })
      .select("id")
      .single();

    if (error || !communication) {
      console.error("[communicatie] createCommunicationAction failed:", error);
      return;
    }

    await logAuditAction("communication_created", "communication", communication.id);

    revalidatePath("/beheer/communicatie");
    redirect(`/beheer/communicatie/${communication.id}`);
  } catch (cause) {
    if (isNextRedirectError(cause)) throw cause;
    console.error("[communicatie] createCommunicationAction threw:", cause);
  }
}

export async function deleteCommunicationAction(communicationId: string): Promise<void> {
  await requireBoard();
  const supabase = await createClient();

  const { data: communication } = await supabase
    .from("communications")
    .select("subject, status")
    .eq("id", communicationId)
    .maybeSingle();

  // Een verzonden campagne is de historie van wat daadwerkelijk naar leden
  // is gegaan — die blijft staan, ook als een bestuurslid 'm liever kwijt
  // zou willen. Alleen concepten (incl. een mislukte verzendpoging) mogen weg.
  if (communication?.status === "verzonden") {
    return;
  }

  await supabase.from("communications").delete().eq("id", communicationId);
  await logAuditAction("communication_deleted", "communication", communicationId, {
    subject: communication?.subject ?? null,
  });

  revalidatePath("/beheer/communicatie");
}
