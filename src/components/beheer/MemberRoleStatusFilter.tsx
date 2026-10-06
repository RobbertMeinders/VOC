"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { ROLE_LABELS } from "@/lib/auth/roles";
import type { UserRole } from "@/lib/types/database";

function updateParam(
  searchParams: URLSearchParams,
  pathname: string,
  router: ReturnType<typeof useRouter>,
  key: "role" | "active",
  value: string
) {
  const params = new URLSearchParams(searchParams);
  if (value) params.set(key, value);
  else params.delete(key);
  router.push(`${pathname}?${params.toString()}`);
}

export function MemberRoleStatusFilter() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  return (
    <div className="mb-4 flex flex-wrap gap-2">
      <select
        value={searchParams.get("role") ?? ""}
        onChange={(e) => updateParam(searchParams, pathname, router, "role", e.target.value)}
        className="h-9 rounded-lg border border-border bg-surface px-2 text-sm text-foreground focus:border-voc-red focus:outline-none focus:ring-2 focus:ring-voc-red/20"
      >
        <option value="">Alle rollen</option>
        {(Object.keys(ROLE_LABELS) as UserRole[]).map((role) => (
          <option key={role} value={role}>
            {ROLE_LABELS[role]}
          </option>
        ))}
      </select>
      <select
        value={searchParams.get("active") ?? ""}
        onChange={(e) => updateParam(searchParams, pathname, router, "active", e.target.value)}
        className="h-9 rounded-lg border border-border bg-surface px-2 text-sm text-foreground focus:border-voc-red focus:outline-none focus:ring-2 focus:ring-voc-red/20"
      >
        <option value="">Alle statussen</option>
        <option value="actief">Actief</option>
        <option value="gedeactiveerd">Gedeactiveerd</option>
      </select>
    </div>
  );
}
