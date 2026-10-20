"use server";

import { revalidatePath } from "next/cache";
import { requireBoard } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { sendTemplatedEmail, invitationGreeting } from "@/lib/email/send";
import { geocodeAddress } from "@/lib/geo/geocode";
import { invalidateQuery } from "@/lib/cache/queryCache";

// Zelfde geldigheidsduur als createInvitationAction (beheer/uitnodigingen/
// actions.ts) — de uitnodigingsmail noemt deze termijn ook letterlijk.
const INVITATION_VALIDITY_MS = 14 * 24 * 60 * 60 * 1000;

// Robbert: "ik kan een aanvraag niet afwijzen" — in de UI (AccessRequestRow)
// heet deze knop nu "Afwijzen" i.p.v. het vage "Afgehandeld", al blijft het
// onderliggende gedrag en de statuswaarde ('handled') ongewijzigd: dit is de
// enige "nee, geen lidmaatschap"-actie die er is.
export async function markAccessRequestHandledAction(id: string) {
  await requireBoard();
  const supabase = await createClient();
  await supabase.from("access_requests").update({ status: "handled" }).eq("id", id);
  revalidatePath("/beheer/instroom");
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
  revalidatePath("/beheer/instroom");

  const link = `${process.env.SITE_URL ?? ""}/register/${invitation.token}`;
  const { error: emailError } = await sendTemplatedEmail("uitnodiging", request.email, {
    link,
    greeting: invitationGreeting(request.first_name),
  });
  if (!emailError) {
    // BUGFIX: deze actie zette expires_at nooit, terwijl 0081 de kolom juist
    // NULL ("nog niet verstuurd") maakte totdat een actie 'm bij een
    // geslaagde verzending zet — zie createInvitationAction (beheer/
    // uitnodigingen/actions.ts) voor hetzelfde patroon. Zonder deze regel
    // bleef expires_at voor élke via een toegangsaanvraag aangemaakte
    // uitnodiging permanent NULL, en get_invitation_preview beoordeelt een
    // NULL expires_at altijd als ongeldig — de link werkte dus nooit.
    await supabase
      .from("invitations")
      .update({ last_sent_at: new Date().toISOString(), expires_at: new Date(Date.now() + INVITATION_VALIDITY_MS).toISOString() })
      .eq("token", invitation.token);
  }

  return { success: true, emailSent: !emailError, emailError };
}
