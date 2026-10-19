import type { LucideIcon } from "lucide-react";
import { clsx } from "clsx";
import type { ReactNode } from "react";

export type StatusTone = "success" | "warning" | "danger" | "neutral" | "petrol";

// Redesign: statuspillen (aanmeldstatus, activiteitsoort, aanvraagstatus
// enz.) gingen tot nu toe vaak naar rood voor "iets om op te letten" — rood
// is voortaan alleen nog fouten. "petrol" is de toon voor neutraal-
// informatief (bv. "Extern" bij een activiteit), de overige vier volgen de
// statustokens uit fase 1 (globals.css).
const toneClasses: Record<StatusTone, string> = {
  success: "bg-status-success-soft text-status-success",
  warning: "bg-status-warning-soft text-status-warning",
  danger: "bg-danger-soft text-danger-text",
  neutral: "bg-status-neutral-soft text-status-neutral",
  petrol: "bg-petrol-soft text-petrol",
};

export function StatusPill({
  tone,
  icon: Icon,
  children,
  className,
}: {
  tone: StatusTone;
  icon?: LucideIcon;
  children: ReactNode;
  className?: string;
}) {
  return (
    <span className={clsx("inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium", toneClasses[tone], className)}>
      {Icon && <Icon size={12} className="shrink-0" />}
      {children}
    </span>
  );
}
