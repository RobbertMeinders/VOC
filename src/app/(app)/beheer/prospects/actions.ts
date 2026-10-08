"use server";

import { revalidatePath } from "next/cache";
import { requireBoard } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { sendTemplatedEmail } from "@/lib/email/send";
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

export type InviteFromProspectState = { error?: string; success?: boolean; emailSent?: boolean };

// UX-review punt 16: hergebruikt dezelfde opzet als
// createInvitationFromAccessRequestAction (beheer/aanvragen/actions.ts) —
// bedrijf opzoeken op naam (geen adres/geocoding, prospects heeft die
// velden niet), uitnodiging met bekende gegevens vooraf invullen, mail
// versturen. prospects.name is één vrij tekstveld (niet voornaam/
// achternaam gesplitst) — op de eerste spatie splitsen, zoals elders in de
// app ook gebeurt bij vrije-naam-invoer.
export async function createInvitationFromProspectAction(prospectId: string): Promise<InviteFromProspectState> {
  const board = await requireBoard();
  const supabase = await createClient();

  const { data: prospect } = await supabase.from("prospects").select("*").eq("id", prospectId).maybeSingle();
  if (!prospect) {
    return { error: "Potentieel lid niet gevonden." };
  }

  const { data: existingInvitation } = await supabase
    .from("invitations")
    .select("id")
    .eq("email", prospect.email)
    .eq("status", "pending")
    .maybeSingle();
  if (existingInvitation) {
    return { error: "Er is al een openstaande uitnodiging voor dit e-mailadres." };
  }

  const [firstName, ...rest] = prospect.name.trim().split(/\s+/);
  const lastName = rest.join(" ") || "";

  let companyId: string | null = null;
  if (prospect.company_name) {
    const { data: existingCompany } = await supabase
      .from("companies")
      .select("id")
      .ilike("name", prospect.company_name)
      .maybeSingle();
    companyId = existingCompany?.id ?? null;
  }

  const { data: invitation, error } = await supabase
    .from("invitations")
    .insert({
      email: prospect.email,
      role: "lid",
      invited_by: board.id,
      first_name: firstName || null,
      last_name: lastName || null,
      company_id: companyId,
    })
    .select("token")
    .single();

  if (error || !invitation) {
    return { error: "Uitnodiging aanmaken is niet gelukt. Probeer het opnieuw." };
  }

  await supabase
    .from("prospects")
    .update({ status: "wil_lid_worden", status_updated_at: new Date().toISOString(), status_updated_by: board.id })
    .eq("id", prospectId);
  revalidatePath("/beheer/instroom");

  const link = `${process.env.SITE_URL ?? ""}/register/${invitation.token}`;
  const { error: emailError } = await sendTemplatedEmail("uitnodiging", prospect.email, { link });
  if (!emailError) {
    await supabase.from("invitations").update({ last_sent_at: new Date().toISOString() }).eq("token", invitation.token);
  }

  return { success: true, emailSent: !emailError };
}
