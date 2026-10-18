"use server";

import { revalidatePath } from "next/cache";
import { requireBoard } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { setBoardPosition } from "@/lib/board/positions";
import { logAuditAction } from "@/lib/audit/log";

export type BoardPositionState = { error?: string; success?: boolean };

// Gedeeld door "bestuurslid toevoegen" en "functie wijzigen" in het
// Bestuur-tabblad — beide zijn uiteindelijk "zet de bestuursfunctie van dit
// profiel op deze titel" via de gedeelde setBoardPosition-helper (ook
// gebruikt door het snel-bewerken-paneel in Beheer -> Leden).
async function applyBoardPosition(profileId: string, title: string): Promise<BoardPositionState> {
  if (!profileId) {
    return { error: "Kies een lid." };
  }
  const viewer = await requireBoard();
  const supabase = await createClient();

  const result = await setBoardPosition(supabase, profileId, title, viewer.id);
  if (result.error) {
    return result;
  }

  await logAuditAction("board_position_updated", "profile", profileId);
  revalidatePath("/beheer/vereniging");
  revalidatePath("/vereniging/bestuur");
  return { success: true };
}

export async function addBoardMemberAction(_prevState: BoardPositionState, formData: FormData): Promise<BoardPositionState> {
  const profileId = String(formData.get("profile_id") ?? "");
  const title = String(formData.get("title") ?? "").trim();
  if (!title) {
    return { error: "Vul een functie in." };
  }
  return applyBoardPosition(profileId, title);
}

export async function setBoardPositionAction(
  profileId: string,
  _prevState: BoardPositionState,
  formData: FormData
): Promise<BoardPositionState> {
  const title = String(formData.get("title") ?? "");
  return applyBoardPosition(profileId, title);
}

export async function removeBoardPositionAction(profileId: string): Promise<BoardPositionState> {
  return applyBoardPosition(profileId, "");
}
