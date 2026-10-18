"use client";

import { Suspense, useMemo, useState } from "react";
import Link from "next/link";
import { ChevronDown, Mail, Pencil, Phone, Users } from "lucide-react";
import { clsx } from "clsx";
import { Avatar } from "@/components/ui/Avatar";
import { MemberRowMenu } from "@/components/members/MemberRowMenu";
import { MemberQuickEditForm } from "@/components/beheer/MemberQuickEditForm";
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
  phone: string | null;
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
  const [expandedId, setExpandedId] = useState<string | null>(null);
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
        const matchesQuery = matchesSearch(
          [`${member.first_name} ${member.last_name}`, member.email, member.phone, member.companyName],
          query
        );
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
        {filtered.map((member) => {
          const expanded = expandedId === member.id;
          // Eén keer gedefinieerd, twee keer gerenderd (hieronder): op mobiel
          // naast de naam, op sm+ aan het einde van de regel — zelfde
          // redenering als Beheer -> Bedrijven.
          const actions = (
            <>
              <button
                type="button"
                onClick={() => setExpandedId(expanded ? null : member.id)}
                aria-label={expanded ? "Snel bewerken sluiten" : "Snel bewerken"}
                aria-expanded={expanded}
                className={clsx(
                  "flex h-8 w-8 shrink-0 items-center justify-center rounded-full border text-foreground hover:border-voc-red hover:text-voc-red-text",
                  expanded ? "border-voc-red bg-voc-red-light text-voc-red-text" : "border-border bg-surface"
                )}
              >
                {expanded ? <ChevronDown size={14} /> : <Pencil size={13} />}
              </button>
              <MemberRowMenu
                memberId={member.id}
                memberName={`${member.first_name} ${member.last_name}`}
                currentRole={member.role}
                isActive={member.is_active}
                canEditRole={canEditRole}
                isSelf={member.id === viewerId}
                isOrganizationAccount={member.is_organization_account}
              />
            </>
          );
          return (
            <div key={member.id} className="rounded-2xl border border-border bg-surface p-3 shadow-sm">
              {/* Op mobiel gestapelde regels (naam+knoppen, dan de
                  contactgegevens eronder). Vanaf sm (brede beheer-pagina) is
                  dit i.p.v. flex-wrap nu een echt grid met vaste
                  kolombreedtes, zodat dezelfde soort gegevens bij elk lid op
                  exact dezelfde horizontale positie staan — een ontbrekend
                  veld (telefoon) laat zijn kolom leeg (invisible, niet
                  weggelaten) i.p.v. de kolommen erna te laten opschuiven. */}
              <div className="flex min-w-0 flex-col gap-1.5 sm:grid sm:grid-cols-[minmax(0,1.6fr)_160px_minmax(0,1.6fr)_130px_auto] sm:items-center sm:gap-x-4 sm:gap-y-0">
                <div className="flex min-w-0 items-center gap-3">
                  <Link href={`/leden/${member.id}`} className="flex min-w-0 items-center gap-3 hover:opacity-80">
                    <Avatar firstName={member.first_name} lastName={member.last_name} avatarUrl={member.avatarUrl} size={36} />
                    <p className="max-w-[12rem] truncate text-sm font-medium text-foreground sm:max-w-none">
                      {member.first_name} {member.last_name}
                      {member.companyName && <span className="font-normal text-muted"> · {member.companyName}</span>}
                    </p>
                  </Link>
                  <div className="ml-auto flex shrink-0 items-center gap-2 sm:hidden">{actions}</div>
                </div>

                <span className="min-w-0 truncate text-xs text-muted" title={`${ROLE_LABELS[member.role]}${!member.is_active ? " · Gedeactiveerd" : ""}`}>
                  {ROLE_LABELS[member.role]}
                  {!member.is_active && " · Gedeactiveerd"}
                </span>

                <span className="flex min-w-0 items-center gap-1 text-xs text-muted">
                  <Mail size={11} className="shrink-0" />
                  <span className="truncate" title={member.email}>
                    {member.email}
                  </span>
                </span>

                <span
                  className={clsx(
                    "flex min-w-0 items-center gap-1 text-xs text-muted",
                    !member.phone && "hidden sm:flex sm:invisible"
                  )}
                >
                  <Phone size={11} className="shrink-0" />
                  <span className="truncate" title={member.phone ?? undefined}>
                    {member.phone}
                  </span>
                </span>

                <div className="hidden shrink-0 items-center gap-2 sm:flex">{actions}</div>
              </div>

              {expanded && (
                <MemberQuickEditForm
                  memberId={member.id}
                  firstName={member.first_name}
                  lastName={member.last_name}
                  phone={member.phone}
                  onSaved={() => setExpandedId(null)}
                />
              )}
            </div>
          );
        })}
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
