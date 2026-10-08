"use client";

import { Suspense, useMemo, useState } from "react";
import Link from "next/link";
import { Users } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { MemberRowMenu } from "@/components/members/MemberRowMenu";
import { OrganizationAccountToggle } from "@/components/members/OrganizationAccountToggle";
import { ListToolbar, type ListToolbarFilter } from "@/components/ui/ListToolbar";
import { ComingSoon } from "@/components/ui/ComingSoon";
import { matchesSearch } from "@/lib/search/normalize";
import { useUrlFilterState } from "@/lib/dom/useUrlFilterState";
import { ROLE_LABELS } from "@/lib/auth/roles";
import type { UserRole } from "@/lib/types/database";

export type BeheerMemberRow = {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  avatar_url: string | null;
  avatarUrl: string | null;
  role: UserRole;
  is_active: boolean;
  is_organization_account: boolean;
  companyName: string | null;
};

function BeheerLedenListInner({ members, viewerId, canEditRole }: { members: BeheerMemberRow[]; viewerId: string; canEditRole: boolean }) {
  const { getInitial, setParam } = useUrlFilterState();
  const [query, setQuery] = useState(() => getInitial("q"));
  const [role, setRole] = useState(() => getInitial("role"));
  // UX-review punt 24: zonder expliciete default stonden gedeactiveerde/
  // verwijderde leden gewoon tussen de actieve leden in de lijst — alleen
  // bewust het Status-filter op "Gedeactiveerd" zetten toont ze nog.
  const [active, setActive] = useState(() => getInitial("active") || "actief");

  function handleQueryChange(value: string) {
    setQuery(value);
    setParam("q", value);
  }
  function handleRoleChange(value: string) {
    setRole(value);
    setParam("role", value);
  }
  function handleActiveChange(value: string) {
    setActive(value);
    setParam("active", value);
  }

  // UX-review Z4: ook op bedrijfsnaam doorzoekbaar, niet alleen naam/e-mail.
  const filtered = useMemo(
    () =>
      members.filter((member) => {
        const matchesQuery = matchesSearch([`${member.first_name} ${member.last_name}`, member.email, member.companyName], query);
        const matchesRole = !role || member.role === role;
        const matchesActive = !active || (active === "actief" ? member.is_active : !member.is_active);
        return matchesQuery && matchesRole && matchesActive;
      }),
    [members, query, role, active]
  );

  const filters: ListToolbarFilter[] = [
    {
      key: "role",
      label: "Rol",
      value: role,
      options: (Object.keys(ROLE_LABELS) as UserRole[]).map((r) => ({ value: r, label: ROLE_LABELS[r] })),
      onChange: handleRoleChange,
    },
    {
      key: "active",
      label: "Status",
      value: active,
      options: [
        { value: "actief", label: "Actief" },
        { value: "gedeactiveerd", label: "Gedeactiveerd" },
      ],
      onChange: handleActiveChange,
    },
  ];

  return (
    <>
      <ListToolbar
        searchValue={query}
        onSearchChange={handleQueryChange}
        searchPlaceholder="Zoek op naam, e-mailadres of bedrijf…"
        resultCount={filtered.length}
        totalCount={members.length}
        filters={filters}
      />

      <div className="flex flex-col gap-3">
        {filtered.length === 0 && <ComingSoon icon={Users} title="Geen leden gevonden" description="Pas je zoekopdracht of filter aan." />}
        {filtered.map((member) => (
          <div key={member.id} className="rounded-2xl border border-border bg-surface p-3 shadow-sm">
            <div className="flex items-center gap-3">
              <Link href={`/leden/${member.id}`} className="flex min-w-0 flex-1 items-center gap-3 hover:opacity-80">
                <Avatar firstName={member.first_name} lastName={member.last_name} avatarUrl={member.avatarUrl} size={40} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-foreground">
                    {member.first_name} {member.last_name}
                    {member.companyName && <span className="font-normal text-muted"> — {member.companyName}</span>}
                  </p>
                  <p className="truncate text-xs text-muted">
                    {ROLE_LABELS[member.role]}
                    {!member.is_active && " · Gedeactiveerd"}
                  </p>
                </div>
              </Link>
              <MemberRowMenu
                memberId={member.id}
                memberName={`${member.first_name} ${member.last_name}`}
                currentRole={member.role}
                isActive={member.is_active}
                canEditRole={canEditRole}
                isSelf={member.id === viewerId}
              />
            </div>
            <div className="mt-2">
              <OrganizationAccountToggle memberId={member.id} initialValue={member.is_organization_account} compact />
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

export function BeheerLedenListClient(props: { members: BeheerMemberRow[]; viewerId: string; canEditRole: boolean }) {
  return (
    <Suspense>
      <BeheerLedenListInner {...props} />
    </Suspense>
  );
}
