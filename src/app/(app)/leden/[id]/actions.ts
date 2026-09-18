"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import type { UserRole } from "@/lib/types/database";

export type UpdateMemberRoleState = { error?: string; success?: boolean };

const VALID_ROLES: UserRole[] = ["lid", "bestuurslid", "beheerder"];

export async function updateMemberRoleAction(
  memberId: string,
  _prevState: UpdateMemberRoleState,
  formData: FormData
): Promise<UpdateMemberRoleState> {
  await requireAdmin();

  const role = String(formData.get("role") ?? "");
  if (!VALID_ROLES.includes(role as UserRole)) {
    return { error: "Ongeldige rol." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("profiles")
    .update({ role: role as UserRole })
    .eq("id", memberId);

  if (error) {
    return { error: "Wijzigen is niet gelukt. Probeer het opnieuw." };
  }

  revalidatePath(`/leden/${memberId}`);
  return { success: true };
}
