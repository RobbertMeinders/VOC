"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin, requireBoard } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { removePreviousImage, uploadImage } from "@/lib/supabase/upload";
import { invalidateQuery } from "@/lib/cache/queryCache";
import { logAuditAction } from "@/lib/audit/log";
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

  // Verlagen mag (ook de eigen rol) — alleen de laatste beheerder blijft
  // beschermd, anders kan niemand het systeem nog beheren.
  if (role !== "beheerder") {
    const { data: target } = await supabase.from("profiles").select("role").eq("id", memberId).single();
    if (target?.role === "beheerder") {
      const { count } = await supabase
        .from("profiles")
        .select("id", { count: "exact", head: true })
        .eq("role", "beheerder");
      if ((count ?? 0) <= 1) {
        return { error: "Er moet minstens één beheerder overblijven." };
      }
    }
  }

  const { error } = await supabase
    .from("profiles")
    .update({ role: role as UserRole })
    .eq("id", memberId);

  if (error) {
    return { error: "Wijzigen is niet gelukt. Probeer het opnieuw." };
  }

  await logAuditAction("member_role_changed", "profile", memberId, { role });

  invalidateQuery("beheer-leden-page-data");
  revalidatePath(`/leden/${memberId}`);
  return { success: true };
}

export type UpdateMemberActiveState = { error?: string; success?: boolean };

export async function updateMemberActiveAction(memberId: string, isActive: boolean): Promise<UpdateMemberActiveState> {
  const viewer = await requireBoard();

  if (memberId === viewer.id) {
    return { error: "Je kunt je eigen account niet deactiveren." };
  }

  const supabase = await createClient();

  if (!isActive) {
    const { data: target } = await supabase.from("profiles").select("role").eq("id", memberId).single();
    if (target?.role === "beheerder") {
      const { count } = await supabase
        .from("profiles")
        .select("id", { count: "exact", head: true })
        .eq("role", "beheerder")
        .eq("is_active", true);
      if ((count ?? 0) <= 1) {
        return { error: "Er moet minstens één actieve beheerder overblijven." };
      }
    }
  }

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

  await logAuditAction(isActive ? "member_activated" : "member_deactivated", "profile", memberId);

  // Deactivering haalt het lid direct uit de (RLS-gefilterde) ledenlijst.
  invalidateQuery("leden-page-data");
  invalidateQuery("beheer-leden-page-data");
  revalidatePath(`/leden/${memberId}`);
  return { success: true };
}

export type UpdateMemberOrganizationAccountState = { error?: string; success?: boolean };

// Markeert een profiel als "dit is de organisatie zelf, geen collega" —
// verandert niets aan rol/rechten, haalt het account alleen uit de
// ledenlijst/zoekresultaten (zie 0046_organization_account.sql).
export async function updateMemberOrganizationAccountAction(
  memberId: string,
  isOrganizationAccount: boolean
): Promise<UpdateMemberOrganizationAccountState> {
  await requireBoard();

  const supabase = await createClient();
  const { error } = await supabase
    .from("profiles")
    .update({ is_organization_account: isOrganizationAccount })
    .eq("id", memberId);

  if (error) {
    return { error: "Wijzigen is niet gelukt. Probeer het opnieuw." };
  }

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
  await requireBoard();

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
  let previousAvatarUrl: string | null = null;
  const avatarFile = formData.get("avatar");
  if (avatarFile instanceof File && avatarFile.size > 0) {
    const { data: existing } = await supabase.from("profiles").select("avatar_url").eq("id", memberId).maybeSingle();
    previousAvatarUrl = existing?.avatar_url ?? null;

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

  if (avatarPath) {
    await removePreviousImage(supabase, "avatars", previousAvatarUrl);
  }

  await logAuditAction("member_profile_updated", "profile", memberId);

  // Naam/functie/avatar staan ook in de ledenlijst.
  invalidateQuery("leden-page-data");
  invalidateQuery("beheer-leden-page-data");
  revalidatePath(`/leden/${memberId}`);
  return { success: true };
}
