"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { uploadImage } from "@/lib/supabase/upload";
import { invalidateQuery } from "@/lib/cache/queryCache";
import type { UpdateProfileState } from "@/app/(app)/profiel/actions";
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

  invalidateQuery("beheer-leden-page-data");
  revalidatePath(`/leden/${memberId}`);
  return { success: true };
}

export type UpdateMemberActiveState = { error?: string; success?: boolean };

export async function updateMemberActiveAction(memberId: string, isActive: boolean): Promise<UpdateMemberActiveState> {
  const admin = await requireAdmin();

  if (memberId === admin.id) {
    return { error: "Je kunt je eigen account niet deactiveren." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("profiles")
    .update({
      is_active: isActive,
      // Start (of stopt, bij heractiveren binnen de 90 dagen) de
      // bewaartermijn-aftelling voor anonymize_expired_profiles()
      // (0037_retention_and_push_preferences.sql, dagelijks via
      // /api/cron/anonymize-members).
      deactivated_at: isActive ? null : new Date().toISOString(),
    })
    .eq("id", memberId);

  if (error) {
    return { error: "Wijzigen is niet gelukt. Probeer het opnieuw." };
  }

  // Deactivering haalt het lid direct uit de (RLS-gefilterde) ledenlijst.
  invalidateQuery("leden-page-data");
  invalidateQuery("beheer-leden-page-data");
  revalidatePath(`/leden/${memberId}`);
  return { success: true };
}

export async function updateMemberProfileAction(
  memberId: string,
  _prevState: UpdateProfileState,
  formData: FormData
): Promise<UpdateProfileState> {
  await requireAdmin();

  const firstName = String(formData.get("first_name") ?? "").trim();
  const lastName = String(formData.get("last_name") ?? "").trim();
  const jobTitle = String(formData.get("job_title") ?? "").trim();
  const bio = String(formData.get("bio") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();
  const showEmail = formData.get("show_email") === "on";
  const showPhone = formData.get("show_phone") === "on";
  const linkedinUrl = String(formData.get("linkedin_url") ?? "").trim();

  if (!firstName || !lastName) {
    return { error: "Voor- en achternaam zijn verplicht." };
  }

  const supabase = await createClient();

  let avatarPath: string | undefined;
  const avatarFile = formData.get("avatar");
  if (avatarFile instanceof File && avatarFile.size > 0) {
    const result = await uploadImage(supabase, "avatars", memberId, avatarFile);
    if ("error" in result) return { error: result.error };
    avatarPath = result.path;
  }

  const { error } = await supabase
    .from("profiles")
    .update({
      first_name: firstName,
      last_name: lastName,
      job_title: jobTitle || null,
      bio: bio || null,
      phone: phone || null,
      show_email: showEmail,
      show_phone: showPhone,
      linkedin_url: linkedinUrl || null,
      ...(avatarPath ? { avatar_url: avatarPath } : {}),
    })
    .eq("id", memberId);

  if (error) {
    return { error: "Opslaan is niet gelukt. Probeer het opnieuw." };
  }

  // Naam/functie/avatar staan ook in de ledenlijst.
  invalidateQuery("leden-page-data");
  invalidateQuery("beheer-leden-page-data");
  revalidatePath(`/leden/${memberId}`);
  return { success: true };
}
