"use client";

import { createContext, useCallback, useContext, useState, type ReactNode } from "react";
import { FloatingPortal } from "@/components/ui/FloatingPortal";
import { Button } from "@/components/ui/Button";
import { useEscapeKey } from "@/lib/dom/useEscapeKey";
import { useBodyScrollLock } from "@/lib/dom/useBodyScrollLock";

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

  const confirm = useCallback<ConfirmFn>((options) => {
    return new Promise<boolean>((resolve) => {
      setPending({ ...options, resolve });
    });
  }, []);

  function close(result: boolean) {
    pending?.resolve(result);
    setPending(null);
  }

  useEscapeKey(Boolean(pending), () => close(false));
  useBodyScrollLock(Boolean(pending));

  return (
    <ConfirmDialogContext.Provider value={confirm}>
      {children}
      {pending && (
        <FloatingPortal>
          <div
            className="animate-fade-in fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
            onClick={() => close(false)}
          >
            <div
              className="animate-scale-in w-full max-w-sm rounded-2xl border border-border bg-surface p-5 shadow-lg"
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
    </ConfirmDialogContext.Provider>
  );
}

export function useConfirm(): ConfirmFn {
  const ctx = useContext(ConfirmDialogContext);
  if (!ctx) throw new Error("useConfirm must be used within a ConfirmDialogProvider");
  return ctx;
}
