import type { UserRole } from "@/lib/types/database";

// Pure helpers (no I/O) so they're safe to import in both Server and Client
// Components — e.g. to conditionally render a "beheren" button. They are
// UX sugar only: the real authorization boundary is Postgres RLS plus the
// server-side guards in lib/auth/session.ts.

export function isBoard(role: UserRole): boolean {
  return role === "bestuurslid" || role === "beheerder";
}

export function isAdmin(role: UserRole): boolean {
  return role === "beheerder";
}

export const ROLE_LABELS: Record<UserRole, string> = {
  lid: "Lid",
  bestuurslid: "Bestuurslid",
  beheerder: "Beheerder",
};

// "Lid" is the common case and gets a neutral badge; board roles keep the
// accent color so elevated privileges still stand out.
export const ROLE_BADGE_CLASS: Record<UserRole, string> = {
  lid: "bg-black/5 text-muted dark:bg-white/10",
  bestuurslid: "bg-voc-red-light text-voc-red",
  beheerder: "bg-voc-red-light text-voc-red",
};
