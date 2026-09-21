"use server";

import { revalidatePath } from "next/cache";
import { requireBoard } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import type { ImportRow } from "@/lib/import/parseCsv";

export type BulkImportSkip = { row: number; email: string; reason: string };
export type BulkImportResult = { imported: number; skipped: BulkImportSkip[] };

/**
 * Creates a pending, prefilled invitation per row — without sending an
 * invite email. A profile only ever gets created when someone actually
 * registers through the link (profiles.id is a foreign key to auth.users,
 * so there is no way to create one up front); this just saves the data on
 * the invitation itself so the registration form can be pre-filled, and the
 * board can send the actual e-mail whenever it's ready to (see
 * sendInvitationEmailAction in ../uitnodigingen/actions.ts).
 */
export async function bulkImportMembersAction(rows: ImportRow[]): Promise<BulkImportResult> {
  const profile = await requireBoard();
  const supabase = await createClient();

  const skipped: BulkImportSkip[] = [];
  const validRows: { row: number; data: ImportRow }[] = [];

  rows.forEach((data, index) => {
    if (!data.email) {
      skipped.push({ row: index + 1, email: data.email, reason: "Geen e-mailadres" });
      return;
    }
    if (!data.firstName || !data.lastName) {
      skipped.push({ row: index + 1, email: data.email, reason: "Voor- of achternaam ontbreekt" });
      return;
    }
    validRows.push({ row: index + 1, data });
  });

  if (validRows.length === 0) {
    return { imported: 0, skipped };
  }

  const [{ data: existingProfiles }, { data: existingInvitations }, { data: companies }] = await Promise.all([
    supabase.from("profiles").select("email"),
    supabase.from("invitations").select("email").eq("status", "pending"),
    supabase.from("companies").select("id, name"),
  ]);

  const existingEmails = new Set((existingProfiles ?? []).map((p) => p.email.toLowerCase()));
  const pendingEmails = new Set((existingInvitations ?? []).map((i) => (i.email ?? "").toLowerCase()));
  const companyByName = new Map((companies ?? []).map((c) => [c.name.toLowerCase(), c.id]));

  const seenInBatch = new Set<string>();
  const toInsert: {
    email: string;
    role: "lid";
    invited_by: string;
    first_name: string;
    last_name: string;
    phone: string | null;
    job_title: string | null;
    company_id: string | null;
  }[] = [];

  for (const { row, data } of validRows) {
    if (existingEmails.has(data.email)) {
      skipped.push({ row, email: data.email, reason: "Er bestaat al een account met dit e-mailadres" });
      continue;
    }
    if (pendingEmails.has(data.email) || seenInBatch.has(data.email)) {
      skipped.push({ row, email: data.email, reason: "Al een openstaande uitnodiging voor dit e-mailadres" });
      continue;
    }
    seenInBatch.add(data.email);

    toInsert.push({
      email: data.email,
      role: "lid",
      invited_by: profile.id,
      first_name: data.firstName,
      last_name: data.lastName,
      phone: data.phone || null,
      job_title: data.jobTitle || null,
      company_id: data.companyName ? (companyByName.get(data.companyName.toLowerCase()) ?? null) : null,
    });
  }

  if (toInsert.length === 0) {
    return { imported: 0, skipped };
  }

  const { error } = await supabase.from("invitations").insert(toInsert);
  if (error) {
    return { imported: 0, skipped: [...skipped, { row: 0, email: "", reason: "Importeren is niet gelukt: " + error.message }] };
  }

  revalidatePath("/beheer/uitnodigingen");
  return { imported: toInsert.length, skipped };
}
