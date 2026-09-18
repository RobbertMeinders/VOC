import type { Metadata } from "next";
import { Logo } from "@/components/ui/Logo";

export const metadata: Metadata = { title: "Account gedeactiveerd" };

export default function AccountDeactivatedPage() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-background px-4 py-12 text-center">
      <div className="mb-8">
        <Logo />
      </div>
      <div className="max-w-sm rounded-2xl border border-border bg-surface p-6 shadow-sm">
        <h1 className="mb-2 text-xl font-semibold text-foreground">Je account is gedeactiveerd</h1>
        <p className="text-sm text-muted">
          Het bestuur heeft je toegang tot het ledenportaal tijdelijk stopgezet. Neem contact op met
          het bestuur van de VOC als je denkt dat dit niet klopt.
        </p>
      </div>
    </div>
  );
}
