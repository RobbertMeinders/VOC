import type { Metadata } from "next";
import { FileText, Folder } from "lucide-react";
import { requireProfile } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { getSignedStorageUrls } from "@/lib/supabase/storage";
import { isBoard } from "@/lib/auth/roles";
import { DocumentUploadForm } from "@/components/documents/DocumentUploadForm";
import { DocumentRow } from "@/components/documents/DocumentRow";
import { ComingSoon } from "@/components/ui/ComingSoon";
import type { Database } from "@/lib/types/database";

export const metadata: Metadata = { title: "Documenten" };

type DocumentRowData = Database["public"]["Tables"]["documents"]["Row"];

const UNCATEGORIZED = "Overig";

export default async function DocumentenPage() {
  const profile = await requireProfile();
  const supabase = await createClient();

  const { data: documents } = await supabase
    .from("documents")
    .select("*")
    .order("created_at", { ascending: false })
    .returns<DocumentRowData[]>();

  const urls = await getSignedStorageUrls(
    supabase,
    "documents",
    (documents ?? []).map((d) => d.storage_path)
  );

  const categories = Array.from(
    new Set((documents ?? []).map((d) => d.category).filter((v): v is string => Boolean(v)))
  ).sort((a, b) => a.localeCompare(b));

  const groups = new Map<string, DocumentRowData[]>();
  for (const doc of documents ?? []) {
    const key = doc.category ?? UNCATEGORIZED;
    const group = groups.get(key) ?? [];
    group.push(doc);
    groups.set(key, group);
  }
  const orderedGroupKeys = [...groups.keys()].sort((a, b) => {
    if (a === UNCATEGORIZED) return 1;
    if (b === UNCATEGORIZED) return -1;
    return a.localeCompare(b);
  });

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-semibold text-foreground">Documenten</h1>
        {isBoard(profile.role) && <DocumentUploadForm categories={categories} />}
      </div>

      {documents && documents.length > 0 ? (
        <div className="flex flex-col gap-6">
          {orderedGroupKeys.map((key) => (
            <div key={key}>
              <h2 className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-muted">
                <Folder size={14} />
                {key}
              </h2>
              <div className="flex flex-col gap-2">
                {(groups.get(key) ?? []).map((doc) => (
                  <DocumentRow
                    key={doc.id}
                    document={doc}
                    url={urls.get(doc.storage_path) ?? null}
                    canManage={isBoard(profile.role)}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <ComingSoon
          icon={FileText}
          title="Nog geen documenten"
          description="Zodra het bestuur documenten deelt, verschijnen ze hier."
        />
      )}
    </div>
  );
}
