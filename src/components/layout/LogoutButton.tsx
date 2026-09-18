"use client";

import { LogOut } from "lucide-react";
import { signOutAction } from "@/lib/auth/actions";

export function LogoutButton() {
  return (
    <form action={signOutAction}>
      <button
        type="submit"
        title="Uitloggen"
        aria-label="Uitloggen"
        className="flex h-8 w-8 items-center justify-center rounded-full text-muted hover:bg-black/[.04] hover:text-voc-red dark:hover:bg-white/[.08]"
      >
        <LogOut size={16} />
      </button>
    </form>
  );
}
