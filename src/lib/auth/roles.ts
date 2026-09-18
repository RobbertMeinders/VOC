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
