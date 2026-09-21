import type { Metadata } from "next";
import { requireProfile } from "@/lib/auth/session";
import { PushToggle } from "@/components/profile/PushToggle";
import { ThemeToggle } from "@/components/profile/ThemeToggle";

export const metadata: Metadata = { title: "Instellingen" };

export default async function InstellingenPage() {
  await requireProfile();

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-semibold text-foreground">Instellingen</h1>

      <div className="rounded-2xl border border-border bg-surface p-6 shadow-sm">
        <p className="mb-2 text-sm font-medium text-foreground">Thema</p>
        <ThemeToggle />
      </div>

      <div className="rounded-2xl border border-border bg-surface p-6 shadow-sm">
        <p className="mb-2 text-sm font-medium text-foreground">Pushmeldingen</p>
        <PushToggle />
      </div>
    </div>
  );
}
