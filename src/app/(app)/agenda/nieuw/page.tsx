import type { Metadata } from "next";
import { requireBoard } from "@/lib/auth/session";
import { ActivityForm } from "@/components/agenda/ActivityForm";
import { createActivityAction } from "@/app/(app)/agenda/actions";

export const metadata: Metadata = { title: "Nieuwe activiteit" };

export default async function NewActivityPage() {
  await requireBoard();

  return (
    <div>
      <h1 className="mb-4 text-xl font-semibold text-foreground">Nieuwe activiteit</h1>
      <div className="rounded-2xl border border-border bg-surface p-6 shadow-sm">
        <ActivityForm action={createActivityAction} submitLabel="Activiteit aanmaken" />
      </div>
    </div>
  );
}
