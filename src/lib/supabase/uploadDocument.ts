import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/types/database";
import { randomFileName } from "./randomFileName";

// Mirrors the documents bucket's allowed_mime_types (0002_storage.sql).
const ALLOWED_DOCUMENT_TYPES: Record<string, string> = {
  "application/pdf": "pdf",
  "image/png": "png",
  "image/jpeg": "jpg",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation": "pptx",
  "application/msword": "doc",
};
const MAX_DOCUMENT_BYTES = 25 * 1024 * 1024;

export type DocumentUploadResult = { path: string } | { error: string };

export async function uploadDocument(
  supabase: SupabaseClient<Database>,
  file: File,
  bucket: "documents" | "activity-attachments" = "documents"
): Promise<DocumentUploadResult> {
  const extension = ALLOWED_DOCUMENT_TYPES[file.type];
  if (!extension) {
    return {
      error: `Bestandstype niet toegestaan (kreeg: ${file.type || "onbekend"}). Toegestaan: PDF, Word, PowerPoint, PNG, JPEG.`,
    };
  }
  if (file.size > MAX_DOCUMENT_BYTES) {
    return { error: "Het bestand mag maximaal 25 MB zijn." };
  }

  const path = `${randomFileName()}.${extension}`;

  try {
    const { error } = await supabase.storage.from(bucket).upload(path, file, {
      contentType: file.type,
      upsert: false,
    });

    if (error) {
      return { error: `Uploaden is niet gelukt: ${error.message}` };
    }

    return { path };
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : "onbekende fout";
    return { error: `Uploaden is niet gelukt: ${message}` };
  }
}
