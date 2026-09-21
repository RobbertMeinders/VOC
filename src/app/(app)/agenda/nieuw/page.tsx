import type { Metadata } from "next";
import { requireProfile } from "@/lib/auth/session";
import { isBoard } from "@/lib/auth/roles";
import { ActivityForm } from "@/components/agenda/ActivityForm";
import { createActivityAction } from "@/app/(app)/agenda/actions";

export const metadata: Metadata = { title: "Nieuwe activiteit" };

export default async function NewActivityPage() {
  const profile = await requireProfile();
  const board = isBoard(profile.role);

  return (
    <div>
      <h1 className="mb-1 text-xl font-semibold text-foreground">
        {board ? "Nieuwe activiteit" : "Activiteit voorstellen"}
      </h1>
      {!board && (
        <p className="mb-4 text-sm text-muted">
          Je activiteit komt pas in de agenda te staan zodra bestuur of beheer &apos;m heeft goedgekeurd.
        </p>
      )}
      <div className="rounded-2xl border border-border bg-surface p-6 shadow-sm">
        <ActivityForm
          action={createActivityAction}
          submitLabel={board ? "Activiteit aanmaken" : "Indienen ter goedkeuring"}
          canUploadImage={board}
          showTypePicker={board}
        />
      </div>
    </div>
  );
}
