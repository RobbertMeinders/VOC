import { AlertCircle, CheckCircle2, Info } from "lucide-react";
import { clsx } from "clsx";
import type { ReactNode } from "react";

type AlertTone = "danger" | "success" | "info";

// Redesign fase 2: de ~30 losse foutkaders en ~10 succeskaders
// ("bg-voc-red-light text-voc-red-text px-3 py-2 ...", met kleine
// verschillen per plek) als één component. Fouten blijven rood
// (danger-tokens); succes/info volgen de nieuwe status-/petroltokens.
const toneClasses: Record<AlertTone, string> = {
  danger: "bg-danger-soft text-danger-text",
  success: "bg-status-success-soft text-status-success",
  info: "bg-petrol-soft text-petrol",
};

const toneIcons: Record<AlertTone, typeof AlertCircle> = {
  danger: AlertCircle,
  success: CheckCircle2,
  info: Info,
};

export function Alert({ tone, children, className }: { tone: AlertTone; children: ReactNode; className?: string }) {
  const Icon = toneIcons[tone];
  return (
    <div
      role={tone === "danger" ? "alert" : "status"}
      className={clsx("flex items-start gap-2 rounded-lg px-3 py-2 text-sm", toneClasses[tone], className)}
    >
      <Icon size={16} className="mt-0.5 shrink-0" />
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
