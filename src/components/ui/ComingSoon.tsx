import type { LucideIcon } from "lucide-react";

export function ComingSoon({ icon: Icon, title, description }: { icon: LucideIcon; title: string; description: string }) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-border py-16 text-center">
      <Icon size={28} className="text-muted" />
      <p className="text-sm font-medium text-foreground">{title}</p>
      <p className="max-w-xs text-sm text-muted">{description}</p>
    </div>
  );
}
