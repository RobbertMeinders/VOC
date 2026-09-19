import { FileText } from "lucide-react";
import { DeleteButton } from "@/components/feed/DeleteButton";
import { deleteDocumentAction } from "@/app/(app)/documenten/actions";
import type { Database } from "@/lib/types/database";

type Document = Database["public"]["Tables"]["documents"]["Row"];

function formatFileSize(bytes: number | null): string {
  if (!bytes) return "";
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function DocumentRow({
  document,
  url,
  canManage,
}: {
  document: Document;
  url: string | null;
  canManage: boolean;
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-border bg-surface p-3 shadow-sm">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-voc-red-light text-voc-red">
        <FileText size={18} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-foreground">{document.title}</p>
        {document.description && <p className="truncate text-xs text-muted">{document.description}</p>}
        <p className="text-xs text-muted">{formatFileSize(document.file_size)}</p>
      </div>
      {url && (
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="rounded-full border border-border px-3 py-1.5 text-xs font-medium text-foreground hover:border-voc-red"
        >
          Downloaden
        </a>
      )}
      {canManage && (
        <DeleteButton
          confirmMessage={`Weet je zeker dat je "${document.title}" wilt verwijderen?`}
          onDelete={deleteDocumentAction.bind(null, document.id, document.storage_path)}
        />
      )}
    </div>
  );
}
