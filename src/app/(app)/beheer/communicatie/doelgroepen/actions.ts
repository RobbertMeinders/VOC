"use server";

import { revalidatePath } from "next/cache";
import { requireBoard } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { logAuditAction } from "@/lib/audit/log";

const PATH = "/beheer/communicatie/doelgroepen";

export type ContactState = { error?: string; contact?: { id: string; name: string; email: string } };

// Ook rechtstreeks aangeroepen vanuit de ontvangers-kiezer in de
// nieuwsbriefeditor ("+ Nieuw contact toevoegen") — niet alleen vanaf deze
// beheerpagina, vandaar dat dit een los aanroepbare functie is i.p.v. enkel
// een <form action>.
export async function createContactAction(name: string, email: string, company?: string): Promise<ContactState> {
  await requireBoard();
  const trimmedName = name.trim();
  const trimmedEmail = email.trim();
  if (!trimmedName || !trimmedEmail) {
    return { error: "Naam en e-mailadres zijn verplicht." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("contacts")
    .insert({ name: trimmedName, email: trimmedEmail, company: company?.trim() || null })
    .select("id, name, email")
    .single();

  if (error || !data) {
    // unique index op lower(email) — de enige realistische conflictoorzaak hier.
    return { error: error?.code === "23505" ? "Er bestaat al een contact met dit e-mailadres." : "Toevoegen is niet gelukt." };
  }

  await logAuditAction("contact_created", "contact", data.id, { email: data.email });
  revalidatePath(PATH);
  return { contact: data };
}

export async function deleteContactAction(contactId: string): Promise<void> {
  await requireBoard();
  const supabase = await createClient();
  await supabase.from("contacts").delete().eq("id", contactId);
  await logAuditAction("contact_deleted", "contact", contactId);
  revalidatePath(PATH);
}

// Naast de afmeldlink in de mail zelf (zie src/app/afmelden/route.ts) kan
// het bestuur een contact ook hier direct af-/weer aanmelden — bijvoorbeeld
// na een telefonisch of mondeling verzoek.
export async function setContactOptedOutAction(contactId: string, optedOut: boolean): Promise<void> {
  await requireBoard();
  const supabase = await createClient();
  await supabase.from("contacts").update({ opted_out: optedOut }).eq("id", contactId);
  await logAuditAction(optedOut ? "contact_unsubscribed" : "contact_resubscribed", "contact", contactId);
  revalidatePath(PATH);
}

export type ListState = { error?: string; list?: { id: string; name: string } };

export async function createListAction(name: string, description?: string): Promise<ListState> {
  const profile = await requireBoard();
  const trimmedName = name.trim();
  if (!trimmedName) {
    return { error: "Naam is verplicht." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("contact_lists")
    .insert({ name: trimmedName, description: description?.trim() || null, created_by: profile.id })
    .select("id, name")
    .single();

  if (error || !data) {
    return { error: "Aanmaken is niet gelukt." };
  }

  await logAuditAction("contact_list_created", "contact_list", data.id, { name: data.name });
  revalidatePath(PATH);
  return { list: data };
}

export async function deleteListAction(listId: string): Promise<void> {
  await requireBoard();
  const supabase = await createClient();
  await supabase.from("contact_lists").delete().eq("id", listId);
  await logAuditAction("contact_list_deleted", "contact_list", listId);
  revalidatePath(PATH);
}

export async function addProfileToListAction(listId: string, profileId: string): Promise<void> {
  await requireBoard();
  const supabase = await createClient();
  await supabase.from("contact_list_profiles").insert({ list_id: listId, profile_id: profileId });
  revalidatePath(PATH);
}

export async function removeProfileFromListAction(listId: string, profileId: string): Promise<void> {
  await requireBoard();
  const supabase = await createClient();
  await supabase.from("contact_list_profiles").delete().eq("list_id", listId).eq("profile_id", profileId);
  revalidatePath(PATH);
}

export async function addContactToListAction(listId: string, contactId: string): Promise<void> {
  await requireBoard();
  const supabase = await createClient();
  await supabase.from("contact_list_contacts").insert({ list_id: listId, contact_id: contactId });
  revalidatePath(PATH);
}

export async function removeContactFromListAction(listId: string, contactId: string): Promise<void> {
  await requireBoard();
  const supabase = await createClient();
  await supabase.from("contact_list_contacts").delete().eq("list_id", listId).eq("contact_id", contactId);
  revalidatePath(PATH);
}
