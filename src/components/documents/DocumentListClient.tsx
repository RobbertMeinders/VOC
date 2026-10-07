"use client";

import { Suspense, useMemo, useState } from "react";
import { FileText, Folder } from "lucide-react";
import { ListToolbar } from "@/components/ui/ListToolbar";
import { matchesSearch } from "@/lib/search/normalize";
import { useUrlFilterState } from "@/lib/dom/useUrlFilterState";
import { ComingSoon } from "@/components/ui/ComingSoon";
import { DocumentRow } from "./DocumentRow";
import type { Database } from "@/lib/types/database";

type DocumentRowData = Database["public"]["Tables"]["documents"]["Row"];

const UNCATEGORIZED = "Overig";

function DocumentListInner({
  documents,
  urls,
  canManage,
}: {
  documents: DocumentRowData[];
  urls: Record<string, string | null>;
  canManage: boolean;
}) {
  const { getInitial, setParam } = useUrlFilterState();
  const [query, setQuery] = useState(() => getInitial("q"));

  function handleQueryChange(value: string) {
    setQuery(value);
    setParam("q", value);
  }

  const filtered = useMemo(
    () => documents.filter((d) => matchesSearch([d.title, d.description, d.category], query)),
    [documents, query]
  );

  const groups = new Map<string, DocumentRowData[]>();
  for (const doc of filtered) {
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
    <>
      {documents.length > 0 && (
        <ListToolbar
          searchValue={query}
          onSearchChange={handleQueryChange}
          searchPlaceholder="Zoek op documentnaam…"
          resultCount={filtered.length}
          totalCount={documents.length}
        />
      )}

      {filtered.length > 0 ? (
        <div className="flex flex-col gap-6">
          {orderedGroupKeys.map((key) => (
            <div key={key}>
              <h2 className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-muted">
                <Folder size={14} />
                {key}
              </h2>
              <div className="flex flex-col gap-2">
                {(groups.get(key) ?? []).map((doc) => (
                  <DocumentRow key={doc.id} document={doc} url={urls[doc.storage_path] ?? null} canManage={canManage} />
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <ComingSoon
          icon={FileText}
          title={query ? "Niets gevonden" : "Nog geen documenten"}
          description={query ? `Geen documenten voor "${query}".` : "Zodra het bestuur documenten deelt, verschijnen ze hier."}
        />
      )}
    </>
  );
}

export function DocumentListClient(props: {
  documents: DocumentRowData[];
  urls: Record<string, string | null>;
  canManage: boolean;
}) {
  return (
    <Suspense>
      <DocumentListInner {...props} />
    </Suspense>
  );
}
