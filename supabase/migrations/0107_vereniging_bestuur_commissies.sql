-- VOC Hub — Vereniging: bestuursfuncties, commissies en Over VOC-inhoud.
--
-- Bewust losse tabellen i.p.v. kolommen op profiles: een bestuursfunctie en
-- een commissielidmaatschap zijn allebei "wie doet welke rol binnen de
-- vereniging" over tijd (met een begin- en eventueel een einddatum), géén
-- eigenschap van het account zelf. Dat houdt ze ook functioneel los van
-- public.user_role (systeemrol = wat iemand in de applicatie mag doen) —
-- geen van beide nieuwe tabellen wijzigt ooit profiles.role, en
-- public.is_board()/is_admin() blijven de enige bron voor rechten. Zie de
-- RLS-policies hieronder: alle schrijfrechten op deze tabellen hangen af van
-- is_board()/is_admin(), nooit van het bestaan van een rij hierin.

-- ---------------------------------------------------------------------------
-- board_positions — bestuursaanstellingen
-- ---------------------------------------------------------------------------
create table public.board_positions (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles (id) on delete cascade,
  title text not null,
  started_at timestamptz not null default now(),
  -- null = actuele functie. Beëindigen is een update (ended_at zetten), geen
  -- delete — zo blijft de geschiedenis van wie wanneer welke functie had
  -- intact, en kan de Bestuur-pagina simpelweg filteren op "ended_at is null"
  -- i.p.v. zelf te moeten bepalen wat "huidig" betekent.
  ended_at timestamptz,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

create index board_positions_profile_idx on public.board_positions (profile_id);
-- Partiële index: alle "wie zit er nu in het bestuur"-queries filteren op
-- ended_at is null, dit is de enige vorm waarin dat vaak gebeurt.
create index board_positions_active_idx on public.board_positions (started_at) where ended_at is null;

alter table public.board_positions enable row level security;

create policy "board_positions_members_select" on public.board_positions
  for select using (public.is_active_member());
create policy "board_positions_board_insert" on public.board_positions
  for insert with check (public.is_board());
create policy "board_positions_board_update" on public.board_positions
  for update using (public.is_board());
create policy "board_positions_board_delete" on public.board_positions
  for delete using (public.is_board());

-- ---------------------------------------------------------------------------
-- commissions — dynamisch beheerde commissies (geen hardcoded lijst)
-- ---------------------------------------------------------------------------
create table public.commissions (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  -- Beëindigen = archiveren (archived_at zetten), niet verwijderen — een
  -- commissie met leden/geschiedenis verdwijnt dan niet archiveren
  -- onomkeerbaar uit beeld. Een beheerder kan een gearchiveerde, lege
  -- commissie nog altijd los verwijderen (cascade raakt alleen
  -- commission_memberships/commission_applications, nooit profiles).
  archived_at timestamptz,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index commissions_archived_idx on public.commissions (archived_at);

alter table public.commissions enable row level security;

create policy "commissions_members_select" on public.commissions
  for select using (public.is_active_member());
create policy "commissions_board_insert" on public.commissions
  for insert with check (public.is_board());
create policy "commissions_board_update" on public.commissions
  for update using (public.is_board());
create policy "commissions_board_delete" on public.commissions
  for delete using (public.is_board());

create trigger commissions_set_updated_at
  before update on public.commissions
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- commission_memberships — n:n leden <-> commissies (een lid kan in meerdere
-- commissies zitten)
-- ---------------------------------------------------------------------------
create table public.commission_memberships (
  id uuid primary key default gen_random_uuid(),
  commission_id uuid not null references public.commissions (id) on delete cascade,
  profile_id uuid not null references public.profiles (id) on delete cascade,
  joined_at timestamptz not null default now(),
  created_by uuid references public.profiles (id) on delete set null,
  unique (commission_id, profile_id)
);

create index commission_memberships_commission_idx on public.commission_memberships (commission_id);
create index commission_memberships_profile_idx on public.commission_memberships (profile_id);

alter table public.commission_memberships enable row level security;

create policy "commission_memberships_members_select" on public.commission_memberships
  for select using (public.is_active_member());
create policy "commission_memberships_board_insert" on public.commission_memberships
  for insert with check (public.is_board());
create policy "commission_memberships_board_delete" on public.commission_memberships
  for delete using (public.is_board());

-- ---------------------------------------------------------------------------
-- commission_applications — aanmeldingen van leden, pas na goedkeuring een
-- echt lidmaatschap (commission_memberships-rij)
-- ---------------------------------------------------------------------------
create table public.commission_applications (
  id uuid primary key default gen_random_uuid(),
  commission_id uuid not null references public.commissions (id) on delete cascade,
  profile_id uuid not null references public.profiles (id) on delete cascade,
  status text not null default 'in_behandeling' check (status in ('in_behandeling', 'goedgekeurd', 'afgewezen')),
  decided_by uuid references public.profiles (id) on delete set null,
  decided_at timestamptz,
  created_at timestamptz not null default now()
);

create index commission_applications_commission_idx on public.commission_applications (commission_id);
create index commission_applications_profile_idx on public.commission_applications (profile_id);
-- Voorkomt dubbele OPENSTAANDE aanvragen voor dezelfde combinatie — na een
-- afwijzing mag een lid het opnieuw proberen (nieuwe rij), maar niet twee
-- tegelijk lopende aanvragen voor dezelfde commissie hebben.
create unique index commission_applications_open_unique
  on public.commission_applications (commission_id, profile_id)
  where status = 'in_behandeling';

alter table public.commission_applications enable row level security;

create policy "commission_applications_self_or_board_select" on public.commission_applications
  for select using (profile_id = auth.uid() or public.is_board());
create policy "commission_applications_self_insert" on public.commission_applications
  for insert with check (profile_id = auth.uid() and public.is_active_member());
-- Alleen bestuur/beheer beslist (status/decided_by/decided_at) — een lid kan
-- zijn eigen aanvraag dus niet zelf goed- of afkeuren.
create policy "commission_applications_board_update" on public.commission_applications
  for update using (public.is_board());

-- ---------------------------------------------------------------------------
-- org_profile — beheerbare inhoud voor de pagina "Over de vereniging"
-- ---------------------------------------------------------------------------
-- Bewust een eigen tabel i.p.v. kolommen op app_settings: app_settings is
-- publiek leesbaar (zonder sessie, voor /login en embeds — zie
-- 0072_app_settings.sql), en interne verenigingsinhoud mag niet automatisch
-- mee-publiceren. Leesbaar voor leden, niet voor anonieme bezoekers; een
-- toekomstige publicatie op de openbare website is hiermee dus een bewuste,
-- latere stap, niet een onbedoeld bijeffect van deze migratie.
create table public.org_profile (
  id boolean primary key default true,
  constraint org_profile_singleton check (id),
  intro_text text,
  mission_text text,
  vision_text text,
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles (id) on delete set null
);

insert into public.org_profile (id) values (true);

alter table public.org_profile enable row level security;

create policy "org_profile_members_select" on public.org_profile
  for select using (public.is_active_member());
create policy "org_profile_board_update" on public.org_profile
  for update using (public.is_board());

create trigger org_profile_set_updated_at
  before update on public.org_profile
  for each row execute function public.set_updated_at();
