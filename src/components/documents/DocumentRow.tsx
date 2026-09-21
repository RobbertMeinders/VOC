"use client";

import { useEffect, useState } from "react";
import { Download, Eye, FileText, X } from "lucide-react";
import { DeleteButton } from "@/components/feed/DeleteButton";
import { deleteDocumentAction } from "@/app/(app)/documenten/actions";
import type { Database } from "@/lib/types/database";

type Document = Database["public"]["Tables"]["documents"]["Row"];

function formatFileSize(bytes: number | null): string {
  if (!bytes) return "";
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function isPreviewable(mimeType: string | null): boolean {
  return mimeType === "application/pdf" || (mimeType?.startsWith("image/") ?? false);
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
  const [previewOpen, setPreviewOpen] = useState(false);
  const previewable = url && isPreviewable(document.mime_type);

  useEffect(() => {
    if (!previewOpen) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") setPreviewOpen(false);
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [previewOpen]);

  return (
    <>
      <div className="flex items-center gap-3 rounded-xl border border-border bg-surface p-3 shadow-sm">
        <button
          type="button"
          onClick={() => previewable && setPreviewOpen(true)}
          disabled={!previewable}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-voc-red-light text-voc-red disabled:cursor-default"
        >
          <FileText size={18} />
        </button>
        <div className="min-w-0 flex-1">
          <button
            type="button"
            onClick={() => previewable && setPreviewOpen(true)}
            disabled={!previewable}
            className="truncate text-left text-sm font-medium text-foreground disabled:cursor-default"
          >
            {document.title}
          </button>
          {document.description && <p className="truncate text-xs text-muted">{document.description}</p>}
          <p className="text-xs text-muted">{formatFileSize(document.file_size)}</p>
        </div>
        {previewable && (
          <button
            type="button"
            onClick={() => setPreviewOpen(true)}
            title="Bekijken"
            aria-label="Bekijken"
            className="flex h-8 w-8 items-center justify-center rounded-full text-muted hover:bg-black/[.04] hover:text-voc-red dark:hover:bg-white/[.08]"
          >
            <Eye size={16} />
          </button>
        )}
        {url && (
          <a
            href={url}
            download={document.file_name}
            target="_blank"
            rel="noopener noreferrer"
            title="Downloaden"
            aria-label="Downloaden"
            className="flex h-8 w-8 items-center justify-center rounded-full text-muted hover:bg-black/[.04] hover:text-voc-red dark:hover:bg-white/[.08]"
          >
            <Download size={16} />
          </a>
        )}
        {canManage && (
          <DeleteButton
            confirmMessage={`Weet je zeker dat je "${document.title}" wilt verwijderen?`}
            onDelete={deleteDocumentAction.bind(null, document.id, document.storage_path)}
          />
        )}
      </div>

      {previewOpen && url && (
        <div
          className="fixed inset-0 z-50 flex flex-col bg-black/60 p-4 sm:p-8"
          onClick={() => setPreviewOpen(false)}
        >
          <div
            className="mx-auto flex h-full w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-surface shadow-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-border px-4 py-3">
              <p className="truncate text-sm font-medium text-foreground">{document.title}</p>
              <button
                type="button"
                onClick={() => setPreviewOpen(false)}
                aria-label="Sluiten"
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-muted hover:bg-black/[.04] hover:text-voc-red dark:hover:bg-white/[.08]"
              >
                <X size={18} />
              </button>
            </div>
            <div className="flex-1 overflow-auto bg-black/[.03] dark:bg-black/20">
              {document.mime_type?.startsWith("image/") ? (
                // eslint-disable-next-line @next/next/no-img-element -- signed URL, no benefit from next/image optimization for a short-lived preview
                <img src={url} alt={document.title} className="mx-auto max-w-full" />
              ) : (
                <iframe src={url} title={document.title} className="h-full w-full" />
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
