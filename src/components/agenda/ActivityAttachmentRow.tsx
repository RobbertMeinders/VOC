import { FileText } from "lucide-react";
import { DeleteButton } from "@/components/feed/DeleteButton";
import { deleteActivityAttachmentAction } from "@/app/(app)/agenda/actions";
import type { Database } from "@/lib/types/database";

type Attachment = Database["public"]["Tables"]["activity_attachments"]["Row"];

export function ActivityAttachmentRow({
  attachment,
  url,
  canManage,
}: {
  attachment: Attachment;
  url: string | null;
  canManage: boolean;
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-border bg-surface p-3 shadow-sm">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-voc-red-light text-voc-red">
        <FileText size={18} />
      </div>
      <p className="min-w-0 flex-1 truncate text-sm font-medium text-foreground">{attachment.file_name}</p>
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
          confirmMessage={`Weet je zeker dat je "${attachment.file_name}" wilt verwijderen?`}
          onDelete={deleteActivityAttachmentAction.bind(null, attachment.activity_id, attachment.id, attachment.storage_path)}
        />
      )}
    </div>
  );
}
