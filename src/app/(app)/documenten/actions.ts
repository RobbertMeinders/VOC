"use server";

import { revalidatePath } from "next/cache";
import { requireBoard } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { uploadDocument } from "@/lib/supabase/uploadDocument";
import { invalidateQuery } from "@/lib/cache/queryCache";
import { logEvent } from "@/lib/events/log";

export type DocumentFormState = { error?: string; success?: boolean };

export async function uploadDocumentAction(
  _prevState: DocumentFormState,
  formData: FormData
): Promise<DocumentFormState> {
  const profile = await requireBoard();

  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const category = String(formData.get("category") ?? "").trim();
  const file = formData.get("file");

  if (!title) {
    return { error: "Titel is verplicht." };
  }
  if (!(file instanceof File) || file.size === 0) {
    return { error: "Kies een bestand om te uploaden." };
  }

  const supabase = await createClient();
  const result = await uploadDocument(supabase, file);
  if ("error" in result) {
    return { error: result.error };
  }

  const { error } = await supabase.from("documents").insert({
    title,
    description: description || null,
    category: category || null,
    storage_path: result.path,
    file_name: file.name,
    file_size: file.size,
    mime_type: file.type,
    uploaded_by: profile.id,
  });

  if (error) {
    return { error: "Opslaan is niet gelukt. Probeer het opnieuw." };
  }

  invalidateQuery("documenten-page-data");
  revalidatePath("/documenten");
  return { success: true };
}

export async function logDocumentViewAction(documentId: string): Promise<void> {
  await logEvent("document_viewed", "document", documentId);
}

export async function deleteDocumentAction(documentId: string, storagePath: string) {
  await requireBoard();
  const supabase = await createClient();
  await supabase.storage.from("documents").remove([storagePath]);
  await supabase.from("documents").delete().eq("id", documentId);
  invalidateQuery("documenten-page-data");
  revalidatePath("/documenten");
}
