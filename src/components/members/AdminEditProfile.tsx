"use client";

import { useState } from "react";
import { Pencil } from "lucide-react";
import { ProfileForm } from "@/components/profile/ProfileForm";
import { updateMemberProfileAction } from "@/app/(app)/leden/[id]/actions";
import type { Profile } from "@/lib/auth/session";

export function AdminEditProfile({ member, avatarUrl }: { member: Profile; avatarUrl: string | null }) {
  const [open, setOpen] = useState(false);
  const action = updateMemberProfileAction.bind(null, member.id);

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 text-sm font-medium text-voc-red hover:underline"
      >
        <Pencil size={14} />
        Profiel bewerken
      </button>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-background p-4">
      <ProfileForm profile={member} avatarUrl={avatarUrl} action={action} />
      <button type="button" onClick={() => setOpen(false)} className="mt-3 text-xs text-muted hover:underline">
        Sluiten
      </button>
    </div>
  );
}
