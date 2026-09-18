import type { ReactNode } from "react";
import { requireProfile } from "@/lib/auth/session";
import { AppShell } from "@/components/layout/AppShell";

export default async function AppLayout({ children }: { children: ReactNode }) {
  const profile = await requireProfile();

  return <AppShell profile={profile}>{children}</AppShell>;
}
