"use client";

import { Suspense, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowDown, ArrowUp, ArrowUpDown, ArrowUpRight, ChevronDown, Clock, Mail, Pencil, Phone, Users } from "lucide-react";
import { clsx } from "clsx";
import { Avatar } from "@/components/ui/Avatar";
import { MemberRowMenu } from "@/components/members/MemberRowMenu";
import { MemberQuickEditForm } from "@/components/beheer/MemberQuickEditForm";
import { ListToolbar, type ListToolbarFilter } from "@/components/ui/ListToolbar";
import { ComingSoon } from "@/components/ui/ComingSoon";
import { matchesSearch } from "@/lib/search/normalize";
import { useUrlFilterState } from "@/lib/dom/useUrlFilterState";
import { ROLE_LABELS } from "@/lib/auth/roles";
import { memberHref } from "@/lib/members/slug";
import { formatLastActive } from "@/lib/format/date";
import { InvitationResendButton } from "@/components/beheer/InvitationResendButton";
import type { UserRole } from "@/lib/types/database";

// "Aanmelden zonder account + personenmodel" Fase 1b: deze lijst toonde
// eerst alleen echte profielen -- nu ook openstaande uitnodigingen en losse
// contacten (via get_people_directory, 0208_people_directory.sql), zodat
// het bestuur in één overzicht alle personen in de pijplijn ziet. `source`
// bepaalt welke acties/velden een rij krijgt; `personStatus` vervangt de
// oude binaire is_active-status als filter.
export type PersonSource = "profiel" | "uitnodiging" | "contact";
export type PersonStatus = "geactiveerd" | "gedeactiveerd" | "uitgenodigd" | "nog_niet_uitgenodigd";

type PersonBase = {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string | null;
  avatar_url: string | null;
  avatarUrl: string | null;
  is_organization_account: boolean;
  anonymized_at: string | null;
  companyName: string | null;
  boardTitle: string | null;
  // Foutenrapport H4: voor de signaal-links vanuit Statistieken -> Overzicht
  // (zelfde definities als src/lib/statistics/overview.ts's signalen).
  last_active_at: string | null;
  neverAttended12mo: boolean;
};

// Discriminated union op `source` i.p.v. één plat type met overal
// optionele/nullable velden -- zo weet TypeScript bij `source === "profiel"`
// dat role/slug/is_active altijd aanwezig zijn (precies wat
// MemberRowMenu/MemberQuickEditForm/memberHref nodig hebben), zonder losse
// non-null-assertions op plekken waar dat feitelijk altijd klopt.
export type BeheerMemberRow =
  | (PersonBase & { source: "profiel"; personStatus: "geactiveerd" | "gedeactiveerd"; slug: string; role: UserRole; is_active: boolean })
  | (PersonBase & { source: "uitnodiging"; personStatus: "uitgenodigd"; slug: null; role: UserRole | null; is_active: false })
  | (PersonBase & { source: "contact"; personStatus: "nog_niet_uitgenodigd"; slug: null; role: null; is_active: false });

const SIGNAL_LABELS: Record<string, string> = {
  incompleet: "Profiel incompleet",
  nooit: "Nooit naar een activiteit (12 mnd)",
  inactief90: "Niet ingelogd, 90+ dagen",
};

const STATUS_LABELS: Record<PersonStatus, string> = {
  geactiveerd: "Geactiveerd",
  gedeactiveerd: "Gedeactiveerd",
  uitgenodigd: "Uitgenodigd",
  nog_niet_uitgenodigd: "Nog niet uitgenodigd",
};

const NINETY_DAYS_MS = 90 * 24 * 60 * 60 * 1000;

function BeheerLedenListInner({ members, viewerId, canEditRole }: { members: BeheerMemberRow[]; viewerId: string; canEditRole: boolean }) {
  const { getInitial, setParam } = useUrlFilterState();
  const [query, setQuery] = useState(() => getInitial("q"));
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [role, setRole] = useState(() => getInitial("role"));
  // UX-review punt 24: zonder expliciete default stonden gedeactiveerde/
  // verwijderde leden gewoon tussen de actieve leden in de lijst — alleen
  // bewust het Status-filter aanpassen toont ze nog. Personenmodel Fase 1b:
  // vier standen i.p.v. de oude binaire actief/gedeactiveerd, default blijft
  // "geactiveerd" (ongewijzigd standaardgedrag: alleen echte, actieve leden).
  const [status, setStatus] = useState(() => getInitial("status") || getInitial("active") || "geactiveerd");
  const [signaal, setSignaal] = useState(() => getInitial("signaal"));
  // "" = geen sortering (standaardvolgorde), "desc" = meest recent actief
  // eerst, "asc" = langst geleden (nooit ingelogd eerst) eerst.
  const [sort, setSort] = useState<"" | "desc" | "asc">(() => {
    const initial = getInitial("sort");
    return initial === "desc" || initial === "asc" ? initial : "";
  });
  // Lazy initializer i.p.v. Date.now() rechtstreeks in de useMemo hieronder
  // aanroepen — die laatste telt als een onzuivere render-aanroep.
  const [ninetyDaysAgo] = useState(() => Date.now() - NINETY_DAYS_MS);

  function cycleSort() {
    const next = sort === "" ? "desc" : sort === "desc" ? "asc" : "";
    setSort(next);
    setParam("sort", next);
  }

  function handleQueryChange(value: string) {
    setQuery(value);
    setParam("q", value);
  }
  function handleRoleChange(value: string) {
    setRole(value);
    setParam("role", value);
  }
  function handleStatusChange(value: string) {
    setStatus(value);
    setParam("status", value);
  }

  // UX-review Z4: ook op bedrijfsnaam doorzoekbaar, niet alleen naam/e-mail.
  const filtered = useMemo(() => {
    return members.filter((member) => {
      const matchesQuery = matchesSearch(
        [`${member.first_name} ${member.last_name}`, member.email, member.phone, member.companyName],
        query
      );
      const matchesRole = !role || member.role === role;
      const matchesStatus = !status || member.personStatus === status;
      // Foutenrapport H4: zelfde definities als de signalen op Statistieken ->
      // Overzicht (zie src/lib/statistics/overview.ts). Deze signalen gaan
      // alleen over echte leden -- de standaard-statusfilter ("geactiveerd")
      // houdt uitnodigingen/contacten hier al vanzelf buiten beeld.
      const matchesSignaal =
        !signaal ||
        (signaal === "incompleet" && (!member.avatar_url || !member.companyName)) ||
        (signaal === "nooit" && member.neverAttended12mo) ||
        (signaal === "inactief90" &&
          member.is_active &&
          (!member.last_active_at || new Date(member.last_active_at).getTime() < ninetyDaysAgo));
      return matchesQuery && matchesRole && matchesStatus && matchesSignaal;
    });
  }, [members, query, role, status, signaal, ninetyDaysAgo]);

  // Nooit-ingelogd (null) telt als "oneindig lang geleden": staat bij
  // aflopend (meest recent eerst) altijd onderaan, bij oplopend bovenaan.
  const sorted = useMemo(() => {
    if (!sort) return filtered;
    const withTime = filtered.map((member) => ({
      member,
      time: member.last_active_at ? new Date(member.last_active_at).getTime() : null,
    }));
    withTime.sort((a, b) => {
      if (a.time === null && b.time === null) return 0;
      if (a.time === null) return sort === "asc" ? -1 : 1;
      if (b.time === null) return sort === "asc" ? 1 : -1;
      return sort === "asc" ? a.time - b.time : b.time - a.time;
    });
    return withTime.map((entry) => entry.member);
  }, [filtered, sort]);

  const filters: ListToolbarFilter[] = [
    {
      key: "role",
      label: "Rol",
      value: role,
      options: (Object.keys(ROLE_LABELS) as UserRole[]).map((r) => ({ value: r, label: ROLE_LABELS[r] })),
      onChange: handleRoleChange,
    },
    {
      key: "status",
      label: "Status",
      value: status,
      options: (Object.keys(STATUS_LABELS) as PersonStatus[]).map((s) => ({ value: s, label: STATUS_LABELS[s] })),
      onChange: handleStatusChange,
    },
  ];

  return (
    <>
      {signaal && SIGNAL_LABELS[signaal] && (
        <div className="mb-3 flex items-center justify-between gap-2 rounded-xl bg-status-warning-soft px-3.5 py-2.5 text-sm text-status-warning">
          <span>
            Filter vanuit Statistieken: <span className="font-medium">{SIGNAL_LABELS[signaal]}</span>
          </span>
          <button
            type="button"
            onClick={() => {
              setSignaal("");
              setParam("signaal", "");
            }}
            className="shrink-0 font-medium underline hover:no-underline"
          >
            Wissen
          </button>
        </div>
      )}
      <ListToolbar
        searchValue={query}
        onSearchChange={handleQueryChange}
        searchPlaceholder="Zoek op naam, e-mailadres of bedrijf…"
        resultCount={sorted.length}
        totalCount={members.length}
        itemLabel="leden"
        filters={filters}
      />

      <div className="mb-3 flex justify-end">
        <button
          type="button"
          onClick={cycleSort}
          className={clsx(
            "flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium",
            sort ? "border-foreground/20 bg-raised text-foreground" : "border-border bg-surface text-muted hover:text-foreground"
          )}
        >
          {sort === "desc" ? <ArrowDown size={13} /> : sort === "asc" ? <ArrowUp size={13} /> : <ArrowUpDown size={13} />}
          Laatst actief
          {sort === "desc" && ": meest recent eerst"}
          {sort === "asc" && ": langst geleden eerst"}
        </button>
      </div>

      {sorted.length === 0 && <ComingSoon icon={Users} title="Geen personen gevonden" description="Pas je zoekopdracht of filter aan." />}
      {/* Tablet-fix (768px): de zijbalk (md:flex, 288px) knijpt het
          contentgebied daar smaller dan de vaste kolombreedtes hieronder
          nodig hebben. Een horizontale scroll binnen de lijst i.p.v. de hele
          pagina laten overlopen — min-w op elke rij voorkomt dat de
          flexibele kolommen tot onleesbaar smal ineenschrompelen. */}
      <div className="overflow-x-auto">
        <div className="flex min-w-0 flex-col gap-3 sm:min-w-[880px]">
          {sorted.map((member) => {
          const expanded = expandedId === member.id;
          // Eén keer gedefinieerd, twee keer gerenderd (hieronder): op mobiel
          // naast de naam, op sm+ aan het einde van de regel — zelfde
          // redenering als Beheer -> Bedrijven.
          // Personenmodel Fase 1b: alleen echte profielen krijgen de volledige
          // rol/activeren-acties -- een uitnodiging kan alleen opnieuw
          // verstuurd worden (bestaande actie, hergebruikt), een los contact
          // heeft geen eigen uitnodigactie hier en linkt door naar Instroom
          // (waar het bestuur het e-mailadres zelf in een uitnodiging zet).
          const actions =
            member.source === "profiel" ? (
              <>
                <button
                  type="button"
                  onClick={() => setExpandedId(expanded ? null : member.id)}
                  aria-label={expanded ? "Snel bewerken sluiten" : "Snel bewerken"}
                  aria-expanded={expanded}
                  className={clsx(
                    "flex h-8 w-8 shrink-0 items-center justify-center rounded-full border text-foreground hover:border-muted hover:text-foreground",
                    expanded ? "border-foreground/20 bg-raised text-foreground" : "border-border bg-surface"
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
                  isAnonymized={member.anonymized_at !== null}
                />
              </>
            ) : member.source === "uitnodiging" ? (
              <InvitationResendButton invitationId={member.id} />
            ) : (
              <Link
                href="/beheer/instroom?tab=uitnodigingen"
                aria-label="Uitnodigen via Instroom"
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-border bg-surface text-foreground hover:border-muted"
              >
                <ArrowUpRight size={14} />
              </Link>
            );
          return (
            <div key={`${member.source}-${member.id}`} className="rounded-2xl bg-surface p-3 shadow-sm">
              {/* Op mobiel gestapelde regels (naam+knoppen, dan de
                  contactgegevens eronder). Vanaf sm (brede beheer-pagina) is
                  dit i.p.v. flex-wrap nu een echt grid met vaste
                  kolombreedtes, zodat dezelfde soort gegevens bij elk lid op
                  exact dezelfde horizontale positie staan — een ontbrekend
                  veld (telefoon) laat zijn kolom leeg (invisible, niet
                  weggelaten) i.p.v. de kolommen erna te laten opschuiven. */}
              <div className="flex min-w-0 flex-col gap-1.5 sm:grid sm:grid-cols-[minmax(0,1.6fr)_160px_minmax(0,1.6fr)_120px_140px_auto] sm:items-center sm:gap-x-4 sm:gap-y-0">
                <div className="flex min-w-0 items-center gap-3">
                  {/* Alleen echte profielen hebben een detailpagina --
                      uitnodigingen/contacten renderen dezelfde inhoud zonder
                      link. */}
                  {member.source === "profiel" && member.slug ? (
                    <Link href={memberHref({ slug: member.slug })} className="flex min-w-0 items-center gap-3 hover:opacity-80">
                      <Avatar firstName={member.first_name} lastName={member.last_name} avatarUrl={member.avatarUrl} size={36} />
                      <p className="max-w-[12rem] truncate text-sm font-medium text-foreground sm:max-w-none">
                        {member.first_name} {member.last_name}
                        {member.companyName && <span className="font-normal text-muted"> · {member.companyName}</span>}
                      </p>
                    </Link>
                  ) : (
                    <div className="flex min-w-0 items-center gap-3">
                      <Avatar firstName={member.first_name} lastName={member.last_name} avatarUrl={member.avatarUrl} size={36} />
                      <p className="max-w-[12rem] truncate text-sm font-medium text-foreground sm:max-w-none">
                        {member.first_name} {member.last_name}
                        {member.companyName && <span className="font-normal text-muted"> · {member.companyName}</span>}
                      </p>
                    </div>
                  )}
                  <div className="ml-auto flex shrink-0 items-center gap-2 sm:hidden">{actions}</div>
                </div>

                <span
                  className="min-w-0 truncate text-xs text-muted"
                  title={
                    member.source === "profiel"
                      ? `${member.role ? ROLE_LABELS[member.role] : ""}${!member.is_active ? " · Gedeactiveerd" : ""}`
                      : STATUS_LABELS[member.personStatus]
                  }
                >
                  {member.source === "profiel" ? (
                    <>
                      {member.role && ROLE_LABELS[member.role]}
                      {!member.is_active && " · Gedeactiveerd"}
                    </>
                  ) : (
                    STATUS_LABELS[member.personStatus]
                  )}
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

                <span
                  className={clsx(
                    "flex min-w-0 items-center gap-1 text-xs text-muted",
                    member.source !== "profiel" && "hidden sm:flex sm:invisible"
                  )}
                >
                  <Clock size={11} className="shrink-0" />
                  <span className="truncate" title={`Laatst actief: ${formatLastActive(member.last_active_at)}`}>
                    {formatLastActive(member.last_active_at)}
                  </span>
                </span>

                <div className="hidden shrink-0 items-center gap-2 sm:flex">{actions}</div>
              </div>

              {expanded && member.source === "profiel" && member.slug && (
                <MemberQuickEditForm
                  memberId={member.id}
                  memberSlug={member.slug}
                  firstName={member.first_name}
                  lastName={member.last_name}
                  phone={member.phone}
                  boardTitle={member.boardTitle}
                  onSaved={() => setExpandedId(null)}
                />
              )}
            </div>
          );
        })}
        </div>
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
