import type { Metadata } from "next";
import { requireProfile } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { getSignedStorageUrls } from "@/lib/supabase/storage";
import { cachedQuery } from "@/lib/cache/queryCache";
import { isBoard } from "@/lib/auth/roles";
import { DocumentUploadForm } from "@/components/documents/DocumentUploadForm";
import { DocumentListClient } from "@/components/documents/DocumentListClient";
import type { Database } from "@/lib/types/database";

export const metadata: Metadata = { title: "Documenten" };

type DocumentRowData = Database["public"]["Tables"]["documents"]["Row"];

export default async function DocumentenPage() {
  const profile = await requireProfile();
  const supabase = await createClient();

  // Zichtbaarheid is voor elk actief lid identiek (documents_members_select
  // kent geen per-gebruiker variatie), dus dit resultaat delen tussen
  // leden/requests is veilig. Zoeken filtert nu client-side (DocumentListClient).
  const { data: allDocuments } = await cachedQuery("documenten-page-data", 60_000, () =>
    supabase.from("documents").select("*").order("created_at", { ascending: false }).returns<DocumentRowData[]>()
  );

  const urls = await getSignedStorageUrls(
    supabase,
    "documents",
    (allDocuments ?? []).map((d) => d.storage_path)
  );

  const categories = Array.from(
    new Set((allDocuments ?? []).map((d) => d.category).filter((v): v is string => Boolean(v)))
  ).sort((a, b) => a.localeCompare(b));

  const urlsRecord: Record<string, string | null> = {};
  for (const doc of allDocuments ?? []) {
    urlsRecord[doc.storage_path] = urls.get(doc.storage_path) ?? null;
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-semibold text-foreground">Documenten</h1>
        {isBoard(profile.role) && <DocumentUploadForm categories={categories} />}
      </div>

      <DocumentListClient documents={allDocuments ?? []} urls={urlsRecord} canManage={isBoard(profile.role)} />
    </div>
  );
}
