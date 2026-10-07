"use client";

import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from "react";
import { CheckCircle2, XCircle } from "lucide-react";
import { FloatingPortal } from "@/components/ui/FloatingPortal";

// UX-review U4: feedback na opslaan was een klein groen "Opgeslagen." naast
// de knop onderaan het formulier — bij lange formulieren of op mobiel viel
// dat buiten beeld. Eén toastsysteem i.p.v. elk formulier zijn eigen
// succesregel: rechtsonder op desktop, boven de bottom nav op mobiel.
export type ToastVariant = "success" | "error";

type ToastItem = { id: number; message: string; variant: ToastVariant };

type ToastFn = (message: string, variant?: ToastVariant) => void;

const ToastContext = createContext<ToastFn | null>(null);

const AUTO_DISMISS_MS = 4000;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const nextId = useRef(0);

  const dismiss = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback<ToastFn>(
    (message, variant = "success") => {
      const id = nextId.current++;
      setToasts((prev) => [...prev, { id, message, variant }]);
      setTimeout(() => dismiss(id), AUTO_DISMISS_MS);
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
                  <CheckCircle2 size={18} className="shrink-0 text-green-600" />
                ) : (
                  <XCircle size={18} className="shrink-0 text-voc-red-text" />
                )}
                <span className="min-w-0">{t.message}</span>
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
