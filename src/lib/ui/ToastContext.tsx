"use client";

import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from "react";
import { CheckCircle2, XCircle } from "lucide-react";
import { FloatingPortal } from "@/components/ui/FloatingPortal";

// UX-review U4: feedback na opslaan was een klein groen "Opgeslagen." naast
// de knop onderaan het formulier — bij lange formulieren of op mobiel viel
// dat buiten beeld. Eén toastsysteem i.p.v. elk formulier zijn eigen
// succesregel: rechtsonder op desktop, boven de bottom nav op mobiel.
export type ToastVariant = "success" | "error";
// F1 (UX-audit): een optionele actieknop (bv. "Ongedaan maken" bij het
// verwijderen van een melding) — met een eigen, langere zichtbaarheidsduur
// dan een gewone bevestigingstoast, anders is de knop alweer verdwenen
// voordat iemand 'm kan gebruiken.
export type ToastAction = { label: string; onClick: () => void };

type ToastItem = { id: number; message: string; variant: ToastVariant; action?: ToastAction };

type ToastFn = (message: string, variant?: ToastVariant, action?: ToastAction) => void;

const ToastContext = createContext<ToastFn | null>(null);

const AUTO_DISMISS_MS = 4000;
const AUTO_DISMISS_WITH_ACTION_MS = 6000;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const nextId = useRef(0);

  const dismiss = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback<ToastFn>(
    (message, variant = "success", action) => {
      const id = nextId.current++;
      setToasts((prev) => [...prev, { id, message, variant, action }]);
      setTimeout(() => dismiss(id), action ? AUTO_DISMISS_WITH_ACTION_MS : AUTO_DISMISS_MS);
    },
    [dismiss]
  );

  return (
    <ToastContext.Provider value={showToast}>
      {children}
      {toasts.length > 0 && (
        <FloatingPortal>
          <div className="pointer-events-none fixed inset-x-4 bottom-20 z-50 flex flex-col items-stretch gap-2 sm:inset-x-auto sm:bottom-4 sm:right-4 sm:items-end">
            {toasts.map((t) => (
              <div
                key={t.id}
                role="status"
                className="animate-rise-in pointer-events-auto flex items-center gap-2 rounded-xl border border-border bg-surface px-4 py-3 text-sm font-medium text-foreground shadow-lg sm:max-w-sm"
              >
                {t.variant === "success" ? (
                  <CheckCircle2 size={18} className="shrink-0 text-status-success" />
                ) : (
                  <XCircle size={18} className="shrink-0 text-voc-red-text" />
                )}
                <span className="min-w-0 flex-1">{t.message}</span>
                {t.action && (
                  <button
                    type="button"
                    onClick={() => {
                      t.action?.onClick();
                      dismiss(t.id);
                    }}
                    className="shrink-0 text-sm font-semibold text-petrol hover:underline"
                  >
                    {t.action.label}
                  </button>
                )}
              </div>
            ))}
          </div>
        </FloatingPortal>
      )}
    </ToastContext.Provider>
  );
}

export function useToast(): ToastFn {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within a ToastProvider");
  return ctx;
}
