"use server";

import { revalidatePath } from "next/cache";
import { requireBoard } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { sendTemplatedEmail } from "@/lib/email/send";
import { geocodeAddress } from "@/lib/geo/geocode";
import { invalidateQuery } from "@/lib/cache/queryCache";

export async function markAccessRequestHandledAction(id: string) {
  await requireBoard();
  const supabase = await createClient();
  await supabase.from("access_requests").update({ status: "handled" }).eq("id", id);
  revalidatePath("/beheer/aanvragen");
}

export type InviteFromAccessRequestState = { error?: string; success?: boolean; emailSent?: boolean; emailError?: string };

// Voorheen moest een aanvrager (via /toegang-aanvragen of de embed) alles
// (naam, bedrijf, adres) nog een tweede keer intypen bij het registreren,
// omdat het bestuur de aanvraag alleen kon markeren als "afgehandeld" en
// daarna zelf, los, een kale uitnodiging (alleen e-mailadres) moest
// aanmaken. Dit hergebruikt exact dezelfde voorgevulde-uitnodiging-opzet als
// de CSV-import (zie bulkImportMembersAction): bedrijf opzoeken/aanmaken,
// uitnodiging met alle bekende velden invullen, mail versturen.
export async function createInvitationFromAccessRequestAction(requestId: string): Promise<InviteFromAccessRequestState> {
  const profile = await requireBoard();
  const supabase = await createClient();

  const { data: request } = await supabase.from("access_requests").select("*").eq("id", requestId).maybeSingle();
  if (!request) {
    return { error: "Aanvraag niet gevonden." };
  }

  const { data: existingProfiles } = await supabase.rpc("get_members_directory");
  if ((existingProfiles ?? []).some((p) => p.email?.toLowerCase() === request.email.toLowerCase())) {
    return { error: "Er bestaat al een account met dit e-mailadres." };
  }
  const { data: existingInvitation } = await supabase
    .from("invitations")
    .select("id")
    .eq("email", request.email)
    .eq("status", "pending")
    .maybeSingle();
  if (existingInvitation) {
    return { error: "Er is al een openstaande uitnodiging voor dit e-mailadres." };
  }

  let companyId: string | null = null;
  if (request.company_name) {
    const { data: existingCompany } = await supabase
      .from("companies")
      .select("id")
      .ilike("name", request.company_name)
      .maybeSingle();

    if (existingCompany) {
      companyId = existingCompany.id;
    } else {
      const coordinates = await geocodeAddress({
        address: request.address,
        postalCode: request.postal_code,
        city: request.city,
      });
      const slug =
        request.company_name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") +
        "-" +
        Math.random().toString(36).slice(2, 8);
      const { data: createdCompany, error: companyError } = await supabase
        .from("companies")
        .insert({
          name: request.company_name,
          slug,
          address: request.address,
          postal_code: request.postal_code,
          city: request.city,
          website: request.website,
          latitude: coordinates?.latitude ?? null,
          longitude: coordinates?.longitude ?? null,
        })
        .select("id")
        .single();

      if (companyError || !createdCompany) {
        return { error: "Bedrijf aanmaken is niet gelukt. Probeer het opnieuw." };
      }
      companyId = createdCompany.id;
      invalidateQuery("bedrijven-page-data");
      invalidateQuery("beheer-bedrijven-page-data");
    }
  }

  const { data: invitation, error } = await supabase
    .from("invitations")
    .insert({
      email: request.email,
      role: "lid",
      invited_by: profile.id,
      first_name: request.first_name,
      last_name: request.last_name,
      phone: request.phone,
      job_title: request.job_title,
      company_id: companyId,
    })
    .select("token")
    .single();

  if (error || !invitation) {
    return { error: "Uitnodiging aanmaken is niet gelukt. Probeer het opnieuw." };
  }

  await supabase.from("access_requests").update({ status: "handled" }).eq("id", requestId);
  revalidatePath("/beheer/aanvragen");
  revalidatePath("/beheer/uitnodigingen");

  const link = `${process.env.SITE_URL ?? ""}/register/${invitation.token}`;
  const { error: emailError } = await sendTemplatedEmail("uitnodiging", request.email, { link });
  if (!emailError) {
    await supabase.from("invitations").update({ last_sent_at: new Date().toISOString() }).eq("token", invitation.token);
  }

  return { success: true, emailSent: !emailError, emailError };
}
