-- Doelgroep per nieuwsbriefcampagne: i.p.v. altijd "alle actieve leden"
-- (recipient_filter bestond al als vrij tekstveld, zie 0065_communications.sql,
-- juist met het oog hierop) kan het bestuur nu kiezen voor specifieke
-- lijsten, en daarnaast altijd losse extra ontvangers toevoegen — leden
-- (nasturen naar iemand die net lid werd, of simpelweg testen) én externe
-- contactpersonen zonder account.

create table public.contacts (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null,
  company text,
  notes text,
  -- Eigen opt-out i.p.v. profiles.email_campaigns (0070): een contact heeft
  -- geen account/instellingenpagina om zich af te melden, dus deze vlag is
  -- hier het enige mechanisme. Vandaag alleen handmatig door het bestuur
  -- te zetten; een afmeldlink in de mail zelf is een latere uitbreiding.
  opted_out boolean not null default false,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);
create unique index contacts_email_uniq on public.contacts (lower(email));

alter table public.contacts enable row level security;
create policy "board_manage_contacts" on public.contacts for all
  using (public.is_board()) with check (public.is_board());

create table public.contact_lists (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);
alter table public.contact_lists enable row level security;
create policy "board_manage_contact_lists" on public.contact_lists for all
  using (public.is_board()) with check (public.is_board());

create table public.contact_list_profiles (
  list_id uuid not null references public.contact_lists (id) on delete cascade,
  profile_id uuid not null references public.profiles (id) on delete cascade,
  primary key (list_id, profile_id)
);
alter table public.contact_list_profiles enable row level security;
create policy "board_manage_contact_list_profiles" on public.contact_list_profiles for all
  using (public.is_board()) with check (public.is_board());

create table public.contact_list_contacts (
  list_id uuid not null references public.contact_lists (id) on delete cascade,
  contact_id uuid not null references public.contacts (id) on delete cascade,
  primary key (list_id, contact_id)
);
alter table public.contact_list_contacts enable row level security;
create policy "board_manage_contact_list_contacts" on public.contact_list_contacts for all
  using (public.is_board()) with check (public.is_board());

-- 'individueel' bestaat bewust niet als derde recipient_filter-waarde: de
-- losse ontvangers hieronder (communication_recipient_profiles/_contacts)
-- gelden altijd bovenop het gekozen filter, niet als los exclusief modus —
-- zie claim_newsletter_recipients/claim_newsletter_contact_recipients
-- verderop. Dat is ook meteen het hele "nasturen"-mechanisme: bij filter
-- 'alle_actieve_leden' pikt een hernieuwde "Versturen"-klik een
-- inmiddels-actief-geworden nieuw lid vanzelf weer op (claim is idempotent,
-- zie 0067), zonder dat daar iets voor geselecteerd hoeft te worden.
alter table public.communications
  add constraint communications_recipient_filter_check
  check (recipient_filter in ('alle_actieve_leden', 'lijsten'));

create table public.communication_recipient_lists (
  communication_id uuid not null references public.communications (id) on delete cascade,
  list_id uuid not null references public.contact_lists (id) on delete cascade,
  primary key (communication_id, list_id)
);
alter table public.communication_recipient_lists enable row level security;
create policy "board_manage_communication_recipient_lists" on public.communication_recipient_lists for all
  using (public.is_board()) with check (public.is_board());

create table public.communication_recipient_profiles (
  communication_id uuid not null references public.communications (id) on delete cascade,
  profile_id uuid not null references public.profiles (id) on delete cascade,
  primary key (communication_id, profile_id)
);
alter table public.communication_recipient_profiles enable row level security;
create policy "board_manage_communication_recipient_profiles" on public.communication_recipient_profiles for all
  using (public.is_board()) with check (public.is_board());

create table public.communication_recipient_contacts (
  communication_id uuid not null references public.communications (id) on delete cascade,
  contact_id uuid not null references public.contacts (id) on delete cascade,
  primary key (communication_id, contact_id)
);
alter table public.communication_recipient_contacts enable row level security;
create policy "board_manage_communication_recipient_contacts" on public.communication_recipient_contacts for all
  using (public.is_board()) with check (public.is_board());

-- Verzend-tracking voor contacten: géén notifications-rij zoals leden die
-- krijgen (notifications.profile_id is not null, zie 0001_init.sql, en dat
-- blijft zo — te veel bestaande plekken bouwen daarop) maar een eigen,
-- parallelle tabel met hetzelfde claim/mark-patroon.
create table public.communication_contact_sends (
  id uuid primary key default gen_random_uuid(),
  communication_id uuid not null references public.communications (id) on delete cascade,
  contact_id uuid not null references public.contacts (id) on delete cascade,
  emailed_at timestamptz,
  email_provider_id text,
  created_at timestamptz not null default now(),
  unique (communication_id, contact_id)
);
alter table public.communication_contact_sends enable row level security;
create policy "board_manage_communication_contact_sends" on public.communication_contact_sends for all
  using (public.is_board()) with check (public.is_board());

-- Geen wijziging van OUT-kolommen t.o.v. 0070, dus create or replace
-- volstaat (in tegenstelling tot 0067's drops). Breidt uit met: filter
-- 'lijsten' (leden uit de gekozen lijsten) en de altijd-actieve extra
-- individuele selectie, bovenop de bestaande is_active/email_campaigns-
-- check.
create or replace function public.claim_newsletter_recipients(p_communication_id uuid)
returns table (notification_id uuid, profile_id uuid, email text)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_filter text;
begin
  if not (public.is_board() or auth.role() = 'service_role') then
    raise exception 'not authorized';
  end if;

  select recipient_filter into v_filter from public.communications where id = p_communication_id;

  insert into public.notifications (profile_id, type, title, communication_id, channel_push_allowed, channel_email_allowed)
  select p.id, 'newsletter', c.subject, c.id, false, false
  from public.profiles p
  cross join public.communications c
  where c.id = p_communication_id
    and p.is_active
    and p.email_campaigns
    and (
      v_filter = 'alle_actieve_leden'
      or (v_filter = 'lijsten' and exists (
        select 1
        from public.communication_recipient_lists crl
        join public.contact_list_profiles clp on clp.list_id = crl.list_id
        where crl.communication_id = c.id and clp.profile_id = p.id
      ))
      or exists (
        select 1 from public.communication_recipient_profiles crp
        where crp.communication_id = c.id and crp.profile_id = p.id
      )
    )
  on conflict (communication_id, profile_id) where communication_id is not null do nothing;

  -- Niet langer "only if null" (0067): de doelgroep kan na een eerste
  -- verzending nog groeien (nasturen), dus total_recipients telt bij elke
  -- claim-aanroep opnieuw de volledige, cumulatieve bedoelde ontvangerslijst
  -- (leden + contacten) na.
  update public.communications
  set total_recipients = (
    (select count(*) from public.notifications where communication_id = p_communication_id)
    + (select count(*) from public.communication_contact_sends where communication_id = p_communication_id)
  )
  where id = p_communication_id;

  return query
  select n.id, n.profile_id, p.email
  from public.notifications n
  join public.profiles p on p.id = n.profile_id
  where n.communication_id = p_communication_id
    and n.emailed_at is null;
end;
$$;

grant execute on function public.claim_newsletter_recipients(uuid) to authenticated, service_role;

-- Analoog aan claim_newsletter_recipients, maar voor contacten: die hebben
-- geen "alle actieve leden"-equivalent (per definitie extern), dus komen
-- alleen binnen via een gekozen lijst of een losse individuele selectie.
create or replace function public.claim_newsletter_contact_recipients(p_communication_id uuid)
returns table (send_id uuid, contact_id uuid, email text)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_filter text;
begin
  if not (public.is_board() or auth.role() = 'service_role') then
    raise exception 'not authorized';
  end if;

  select recipient_filter into v_filter from public.communications where id = p_communication_id;

  insert into public.communication_contact_sends (communication_id, contact_id)
  select p_communication_id, ct.id
  from public.contacts ct
  where not ct.opted_out
    and (
      (v_filter = 'lijsten' and exists (
        select 1
        from public.communication_recipient_lists crl
        join public.contact_list_contacts clc on clc.list_id = crl.list_id
        where crl.communication_id = p_communication_id and clc.contact_id = ct.id
      ))
      or exists (
        select 1 from public.communication_recipient_contacts crc
        where crc.communication_id = p_communication_id and crc.contact_id = ct.id
      )
    )
  on conflict (communication_id, contact_id) do nothing;

  update public.communications
  set total_recipients = (
    (select count(*) from public.notifications where communication_id = p_communication_id)
    + (select count(*) from public.communication_contact_sends where communication_id = p_communication_id)
  )
  where id = p_communication_id;

  return query
  select s.id, s.contact_id, ct.email
  from public.communication_contact_sends s
  join public.contacts ct on ct.id = s.contact_id
  where s.communication_id = p_communication_id
    and s.emailed_at is null;
end;
$$;

grant execute on function public.claim_newsletter_contact_recipients(uuid) to authenticated, service_role;

-- Mirror van mark_newsletter_notification_sent (0067), voor contacten.
create or replace function public.mark_newsletter_contact_sent(p_send_id uuid, p_provider_id text default null)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not (public.is_board() or auth.role() = 'service_role') then
    raise exception 'not authorized';
  end if;

  update public.communication_contact_sends
  set emailed_at = now(), email_provider_id = p_provider_id
  where id = p_send_id;
end;
$$;

grant execute on function public.mark_newsletter_contact_sent(uuid, text) to authenticated, service_role;

-- Telt nu leden (notifications) én contacten (communication_contact_sends)
-- mee in total/sent — zelfde "nooit een halve verzending als succesvol
-- rapporteren"-kernregel als 0067, nu over beide ontvangertypes heen.
create or replace function public.finalize_newsletter_send(p_communication_id uuid)
returns table (total integer, sent integer)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_total integer;
  v_sent integer;
begin
  if not (public.is_board() or auth.role() = 'service_role') then
    raise exception 'not authorized';
  end if;

  select
    (select count(*) from public.notifications where communication_id = p_communication_id)
    + (select count(*) from public.communication_contact_sends where communication_id = p_communication_id),
    (select count(*) from public.notifications where communication_id = p_communication_id and emailed_at is not null)
    + (select count(*) from public.communication_contact_sends where communication_id = p_communication_id and emailed_at is not null)
  into v_total, v_sent;

  update public.communications
  set status = case when v_total > 0 and v_sent >= v_total then 'verzonden' else 'verzenden_mislukt' end,
      sent_at = case when v_total > 0 and v_sent >= v_total and sent_at is null then now() else sent_at end
  where id = p_communication_id;

  return query select v_total, v_sent;
end;
$$;

grant execute on function public.finalize_newsletter_send(uuid) to authenticated, service_role;
