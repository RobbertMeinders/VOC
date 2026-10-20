"use client";

import { createContext, useCallback, useContext, useState, type ReactNode } from "react";
import { FloatingPortal } from "@/components/ui/FloatingPortal";
import { Button } from "@/components/ui/Button";
import { useEscapeKey } from "@/lib/dom/useEscapeKey";
import { useBodyScrollLock } from "@/lib/dom/useBodyScrollLock";

// Koppelverzoeken onder Aanvragen (Beheer -> Aanvragen -> Bedrijfskoppelingen):
// afwijzen vraagt om bevestiging mét een optionele toelichting. confirm()
// hierboven blijft ongewijzigd (overal elders al Promise<boolean>, een lege
// string als "aanvaard, geen reden" zou daar als falsy afgewezen worden) —
// een los paar state/dialoog ernaast i.p.v. die hook te verbouwen.
export type ConfirmWithReasonOptions = {
  title: string;
  description?: string;
  confirmLabel: string;
  cancelLabel?: string;
  reasonLabel?: string;
  reasonPlaceholder?: string;
  danger?: boolean;
};

export type ConfirmWithReasonResult = { confirmed: boolean; reason: string };

type PendingConfirmWithReason = ConfirmWithReasonOptions & { resolve: (value: ConfirmWithReasonResult) => void };

type ConfirmWithReasonFn = (options: ConfirmWithReasonOptions) => Promise<ConfirmWithReasonResult>;

const ConfirmWithReasonContext = createContext<ConfirmWithReasonFn | null>(null);

// UX-review V10: `window.confirm()` is een grijze systeemdialoog zonder
// merk, met generieke "OK/Annuleren"-knoppen en zonder ruimte om het gevolg
// van de actie te benoemen. Deze vervangt 'm voor destructieve/onomkeerbare
// acties (verwijderen, pushbericht versturen, nieuwsbrief versturen) — de
// knoptekst noemt de actie zelf ("Bericht verwijderen"), en een optionele
// beschrijving benoemt het gevolg in één zin.
//
// confirm() is Promise-based (i.p.v. window.confirm's synchrone boolean) —
// nodig omdat het antwoord nu van een los geopende dialoog komt, niet
// meteen uit de aanroep zelf. Bestaande `if (window.confirm(...)) { ... }`-
// code wordt dus `if (await confirm({ ... })) { ... }`.
export type ConfirmOptions = {
  title: string;
  description?: string;
  confirmLabel: string;
  cancelLabel?: string;
  danger?: boolean;
};

type PendingConfirm = ConfirmOptions & { resolve: (value: boolean) => void };

type ConfirmFn = (options: ConfirmOptions) => Promise<boolean>;

const ConfirmDialogContext = createContext<ConfirmFn | null>(null);

export function ConfirmDialogProvider({ children }: { children: ReactNode }) {
  const [pending, setPending] = useState<PendingConfirm | null>(null);
  const [pendingReason, setPendingReason] = useState<PendingConfirmWithReason | null>(null);
  const [reasonValue, setReasonValue] = useState("");

  const confirm = useCallback<ConfirmFn>((options) => {
    return new Promise<boolean>((resolve) => {
      setPending({ ...options, resolve });
    });
  }, []);

  const confirmWithReason = useCallback<ConfirmWithReasonFn>((options) => {
    return new Promise<ConfirmWithReasonResult>((resolve) => {
      setReasonValue("");
      setPendingReason({ ...options, resolve });
    });
  }, []);

  function close(result: boolean) {
    pending?.resolve(result);
    setPending(null);
  }

  function closeReason(confirmed: boolean) {
    pendingReason?.resolve({ confirmed, reason: reasonValue.trim() });
    setPendingReason(null);
  }

  useEscapeKey(Boolean(pending), () => close(false));
  useBodyScrollLock(Boolean(pending));
  useEscapeKey(Boolean(pendingReason), () => closeReason(false));
  useBodyScrollLock(Boolean(pendingReason));

  return (
    <ConfirmDialogContext.Provider value={confirm}>
      <ConfirmWithReasonContext.Provider value={confirmWithReason}>
        {children}
        {pending && (
          <FloatingPortal>
            <div
              className="animate-fade-in fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
              onClick={() => close(false)}
            >
              <div
                className="animate-scale-in w-full max-w-sm rounded-2xl bg-surface p-5 shadow-lg"
                onClick={(e) => e.stopPropagation()}
              >
                <h2 className="text-base font-semibold text-foreground">{pending.title}</h2>
                {pending.description && <p className="mt-1.5 text-sm text-muted">{pending.description}</p>}
                <div className="mt-5 flex justify-end gap-2">
                  <Button type="button" variant="ghost" size="sm" onClick={() => close(false)}>
                    {pending.cancelLabel ?? "Annuleren"}
                  </Button>
                  <Button type="button" variant={pending.danger ? "danger" : "primary"} size="sm" onClick={() => close(true)}>
                    {pending.confirmLabel}
                  </Button>
                </div>
              </div>
            </div>
          </FloatingPortal>
        )}
        {pendingReason && (
          <FloatingPortal>
            <div
              className="animate-fade-in fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
              onClick={() => closeReason(false)}
            >
              <div
                className="animate-scale-in w-full max-w-sm rounded-2xl bg-surface p-5 shadow-lg"
                onClick={(e) => e.stopPropagation()}
              >
                <h2 className="text-base font-semibold text-foreground">{pendingReason.title}</h2>
                {pendingReason.description && <p className="mt-1.5 text-sm text-muted">{pendingReason.description}</p>}
                <label className="mt-3 block text-xs font-medium text-muted">
                  {pendingReason.reasonLabel ?? "Reden (optioneel)"}
                  <textarea
                    value={reasonValue}
                    onChange={(e) => setReasonValue(e.target.value)}
                    rows={3}
                    placeholder={pendingReason.reasonPlaceholder}
                    className="mt-1 w-full resize-none rounded-lg border border-input-border bg-background px-3 py-2 text-sm font-normal text-foreground focus:border-petrol focus:outline-none focus:ring-2 focus:ring-petrol/20"
                  />
                </label>
                <div className="mt-4 flex justify-end gap-2">
                  <Button type="button" variant="ghost" size="sm" onClick={() => closeReason(false)}>
                    {pendingReason.cancelLabel ?? "Annuleren"}
                  </Button>
                  <Button
                    type="button"
                    variant={pendingReason.danger ? "danger" : "primary"}
                    size="sm"
                    onClick={() => closeReason(true)}
                  >
                    {pendingReason.confirmLabel}
                  </Button>
                </div>
              </div>
            </div>
          </FloatingPortal>
        )}
      </ConfirmWithReasonContext.Provider>
    </ConfirmDialogContext.Provider>
  );
}

export function useConfirm(): ConfirmFn {
  const ctx = useContext(ConfirmDialogContext);
  if (!ctx) throw new Error("useConfirm must be used within a ConfirmDialogProvider");
  return ctx;
}

export function useConfirmWithReason(): ConfirmWithReasonFn {
  const ctx = useContext(ConfirmWithReasonContext);
  if (!ctx) throw new Error("useConfirmWithReason must be used within a ConfirmDialogProvider");
  return ctx;
}
