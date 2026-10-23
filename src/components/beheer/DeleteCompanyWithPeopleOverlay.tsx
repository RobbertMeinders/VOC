"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";
import { useEscapeKey } from "@/lib/dom/useEscapeKey";
import { useBodyScrollLock } from "@/lib/dom/useBodyScrollLock";
import { FloatingPortal } from "@/components/ui/FloatingPortal";
import { Button } from "@/components/ui/Button";
import {
  previewDeleteCompanyWithPeopleAction,
  deleteCompanyWithPeopleAction,
  type CompanyDeletionPreview,
} from "@/app/(app)/bedrijven/[id]/actions";

// Opschoonknop (task #183): aparte, nadrukkelijk gelabelde variant naast de
// gewone "Bedrijf verwijderen" — laat vóór de onomkeerbare actie precies
// zien wie er geanonimiseerd wordt (alleen aan dit bedrijf gekoppeld) en wie
// blijft bestaan (ook elders gekoppeld), plus hoeveel openstaande
// uitnodigingen worden ingetrokken. Eén expliciete bevestiging, geen
// os-confirm() — zelfde FloatingPortal-opbouw als ReportPostOverlay.
export function DeleteCompanyWithPeopleOverlay({
  companyId,
  onClose,
}: {
  companyId: string;
  onClose: () => void;
}) {
  const router = useRouter();
  const [preview, setPreview] = useState<CompanyDeletionPreview | { error: string } | null>(null);
  const [state, setState] = useState<{ error?: string; pending?: boolean; done?: boolean }>({});

  useEscapeKey(true, onClose);
  useBodyScrollLock(true);

  useEffect(() => {
    let cancelled = false;
    void previewDeleteCompanyWithPeopleAction(companyId).then((result) => {
      if (!cancelled) setPreview(result);
    });
    return () => {
      cancelled = true;
    };
  }, [companyId]);

  async function handleConfirm() {
    setState({ pending: true });
    const result = await deleteCompanyWithPeopleAction(companyId);
    if (result.error) {
      setState({ error: result.error });
      return;
    }
    setState({ done: true });
    router.refresh();
  }

  return (
    <FloatingPortal>
      <div className="fixed inset-0 z-40 cursor-pointer bg-black/60 animate-fade-in" onClick={onClose} />
      <div className="fixed inset-x-3 top-1/2 z-50 -translate-y-1/2 sm:inset-x-0 sm:mx-auto sm:w-full sm:max-w-md sm:px-3 md:left-72">
        <div className="animate-scale-in rounded-2xl bg-surface shadow-lg">
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <p className="text-sm font-semibold text-foreground">Bedrijf verwijderen inclusief personen</p>
            <button
              type="button"
              onClick={onClose}
              aria-label="Sluiten"
              className="flex h-7 w-7 items-center justify-center rounded-full text-muted hover:bg-black/[.04] hover:text-foreground dark:hover:bg-white/[.08]"
            >
              <X size={16} />
            </button>
          </div>

          <div className="max-h-[70vh] overflow-y-auto p-4">
            {state.done ? (
              <>
                <p className="text-sm text-foreground">
                  {preview && !("error" in preview) ? preview.companyName : "Het bedrijf"} is verwijderd.
                </p>
                <Button type="button" variant="primary" size="sm" className="mt-3" onClick={onClose}>
                  Sluiten
                </Button>
              </>
            ) : !preview ? (
              <p className="text-sm text-muted">Bezig met ophalen…</p>
            ) : "error" in preview ? (
              <p className="text-sm text-danger-text">{preview.error}</p>
            ) : (
              <>
                <p className="text-sm text-foreground">
                  Je staat op het punt om <span className="font-medium">{preview.companyName}</span> definitief te
                  verwijderen, inclusief de personen die alleen aan dit bedrijf gekoppeld zijn.
                </p>

                {preview.removed.length > 0 && (
                  <div className="mt-3">
                    <p className="text-xs font-medium text-danger-text">
                      {preview.removed.length} {preview.removed.length === 1 ? "persoon wordt" : "personen worden"} verwijderd
                      (geanonimiseerd):
                    </p>
                    <ul className="mt-1 list-inside list-disc text-xs text-muted">
                      {preview.removed.map((p) => (
                        <li key={p.id}>{p.name}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {preview.kept.length > 0 && (
                  <div className="mt-3">
                    <p className="text-xs font-medium text-foreground">
                      {preview.kept.length} {preview.kept.length === 1 ? "persoon blijft" : "personen blijven"} staan (ook
                      elders gekoppeld):
                    </p>
                    <ul className="mt-1 list-inside list-disc text-xs text-muted">
                      {preview.kept.map((p) => (
                        <li key={p.id}>{p.name}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {preview.pendingInvitations > 0 && (
                  <p className="mt-3 text-xs text-muted">
                    {preview.pendingInvitations} openstaande{" "}
                    {preview.pendingInvitations === 1 ? "uitnodiging wordt" : "uitnodigingen worden"} ingetrokken.
                  </p>
                )}

                <p className="mt-3 text-xs text-danger-text">Dit kan niet ongedaan gemaakt worden.</p>

                {state.error && <p className="mt-2 text-xs text-danger-text">{state.error}</p>}

                <div className="mt-4 flex items-center gap-2">
                  <Button type="button" variant="danger" size="sm" disabled={state.pending} onClick={handleConfirm}>
                    {state.pending ? "Bezig…" : "Definitief verwijderen"}
                  </Button>
                  <button type="button" onClick={onClose} className="text-sm text-muted hover:underline">
                    Annuleren
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </FloatingPortal>
  );
}
