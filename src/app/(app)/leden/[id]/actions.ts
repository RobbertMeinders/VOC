"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin, requireBoard } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
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

export type DeleteMemberState = { error?: string };

// Direct verwijderen i.p.v. de 90-dagen-wachttijd van updateMemberActiveAction
// (die alleen deactiveert) — zelfde eindresultaat (persoonsgegevens gewist,
// account onbruikbaar, geplaatste berichten/reacties blijven staan onder
// "Verwijderd lid"), maar nu meteen via anonymize_profile_now()
// (0078_anonymize_profile_now.sql). Haalt de bedrijfskoppeling meteen weg en
// verdwijnt daardoor (is_active=false) ook meteen uit de ledenlijst.
export async function deleteMemberAction(memberId: string): Promise<DeleteMemberState> {
  const viewer = await requireAdmin();

  if (memberId === viewer.id) {
    return { error: "Je kunt jezelf niet op deze manier verwijderen." };
  }

  const supabase = await createClient();

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

  // company_members_self_or_board_delete (0001_init.sql) staat bestuur/
  // beheer toe om ook andermans koppeling te verwijderen.
  await supabase.from("company_members").delete().eq("profile_id", memberId);

  const admin = createAdminClient();
  const { data: anonymized, error } = await admin.rpc("anonymize_profile_now", { p_id: memberId });

  if (error || !anonymized || anonymized.length === 0) {
    return { error: "Verwijderen is niet gelukt. Probeer het opnieuw." };
  }

  const [{ old_avatar_url }] = anonymized;
  await admin.auth.admin.updateUserById(memberId, { email: `verwijderd-${memberId}@voc-ledenportaal.invalid` });
  if (old_avatar_url) {
    await admin.storage.from("avatars").remove([old_avatar_url]);
  }

  await logAuditAction("member_deleted", "profile", memberId);

  invalidateQuery("leden-page-data");
  invalidateQuery("beheer-leden-page-data");
  invalidateQuery("bedrijven-page-data");
  invalidateQuery("beheer-bedrijven-page-data");
  revalidatePath("/leden");
  revalidatePath("/beheer/leden");
  revalidatePath(`/leden/${memberId}`);
  return {};
}

export type GenerateLoginLinkState = { error?: string; link?: string };

// UX-review punt 4: bestuur moet een lid soms kunnen helpen inloggen (bv.
// telefonisch support). Hergebruikt hetzelfde generateLink(magiclink) +
// /auth/confirm-mechanisme als de eigen "inloggen zonder wachtwoord"-knop op
// /login (login/actions.ts) i.p.v. een nieuw, eigen tokensysteem te bouwen —
// de link is eenmalig, raakt automatisch ongeldig (Supabase's eigen Email
// OTP-vervaltijd) en wordt nergens in onze eigen database opgeslagen.
export async function generateLoginLinkAction(memberId: string): Promise<GenerateLoginLinkState> {
  const viewer = await requireBoard();

  const supabase = await createClient();
  const { data: target } = await supabase
    .from("profiles")
    .select("email, role, is_active")
    .eq("id", memberId)
    .maybeSingle();

  if (!target) {
    return { error: "Lid niet gevonden." };
  }
  if (!target.is_active) {
    return { error: "Dit account is gedeactiveerd." };
  }
  // Een gewoon bestuurslid mag geen inloglink genereren voor een ander
  // bestuurslid of beheerder — alleen de beheerder mag dat.
  if (target.role !== "lid" && viewer.role !== "beheerder") {
    return { error: "Alleen een beheerder kan een inloglink genereren voor een bestuurslid of beheerder." };
  }

  const admin = createAdminClient();
  const { data: linkData, error: linkError } = await admin.auth.admin.generateLink({
    type: "magiclink",
    email: target.email,
  });
  const hashedToken = linkData?.properties?.hashed_token;

  if (linkError || !hashedToken) {
    return { error: "Inloglink genereren is niet gelukt." };
  }

  const link = `${process.env.SITE_URL ?? ""}/auth/confirm?token_hash=${hashedToken}&type=magiclink&next=${encodeURIComponent("/")}`;

  // Nooit het token/de link zelf loggen — alleen wie, wanneer en voor wie.
  await logAuditAction("member_login_link_generated", "profile", memberId);

  return { link };
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
