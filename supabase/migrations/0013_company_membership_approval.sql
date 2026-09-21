-- Elk lid kon zich tot nu toe zonder enige goedkeuring aan elk willekeurig
-- bedrijf koppelen (company_members_self_or_board_insert stond dat toe).
-- Vanaf nu loopt dat via een aanvraag die een bestaand (goedgekeurd) lid van
-- dat bedrijf, of bestuur/beheerder, moet goedkeuren.

create table public.company_membership_requests (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  profile_id uuid not null references public.profiles (id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  requested_at timestamptz not null default now(),
  decided_by uuid references public.profiles (id),
  decided_at timestamptz,
  unique (company_id, profile_id)
);

create index company_membership_requests_company_idx on public.company_membership_requests (company_id);
create index company_membership_requests_profile_idx on public.company_membership_requests (profile_id);

alter table public.company_membership_requests enable row level security;

-- Zichtbaar voor de aanvrager zelf, bestaande (goedgekeurde) leden van dat
-- bedrijf, en bestuur/beheerder.
create policy "company_membership_requests_select" on public.company_membership_requests
  for select using (
    profile_id = auth.uid()
    or public.is_board()
    or exists (
      select 1 from public.company_members cm
      where cm.company_id = company_membership_requests.company_id and cm.profile_id = auth.uid()
    )
  );

-- Een lid kan alleen voor zichzelf een aanvraag indienen.
create policy "company_membership_requests_self_insert" on public.company_membership_requests
  for insert with check (profile_id = auth.uid() and public.is_active_member());

-- Goedkeuren/afwijzen: bestaand lid van dat bedrijf, of bestuur/beheerder.
-- (Niet de aanvrager zelf — die kan wel zijn eigen pending-aanvraag intrekken,
-- zie de delete-policy hieronder.)
create policy "company_membership_requests_decide_update" on public.company_membership_requests
  for update using (
    public.is_board()
    or exists (
      select 1 from public.company_members cm
      where cm.company_id = company_membership_requests.company_id and cm.profile_id = auth.uid()
    )
  );

create policy "company_membership_requests_self_or_board_delete" on public.company_membership_requests
  for delete using (
    (profile_id = auth.uid() and status = 'pending') or public.is_board()
  );

-- Bij goedkeuring meteen de company_members-rij aanmaken. security definer
-- omdat de goedkeurder vaak een gewoon lid is (niet bestuur), en die mag via
-- company_members_self_or_board_insert geen rij voor een ánder profiel_id
-- aanmaken.
create or replace function public.handle_company_membership_decision()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status = 'approved' and old.status is distinct from 'approved' then
    insert into public.company_members (company_id, profile_id)
    values (new.company_id, new.profile_id)
    on conflict do nothing;
  end if;

  if new.status in ('approved', 'rejected') and old.status is distinct from new.status then
    new.decided_at = now();

    insert into public.notifications (profile_id, type, title, body, link)
    values (
      new.profile_id,
      'company_membership_decision',
      case when new.status = 'approved' then 'Bedrijfskoppeling goedgekeurd' else 'Bedrijfskoppeling afgewezen' end,
      case
        when new.status = 'approved' then 'Je aanvraag om aan dit bedrijf gekoppeld te worden is goedgekeurd.'
        else 'Je aanvraag om aan dit bedrijf gekoppeld te worden is afgewezen.'
      end,
      '/bedrijven/' || new.company_id
    );
  end if;

  return new;
end;
$$;

create trigger company_membership_requests_decide
  before update on public.company_membership_requests
  for each row execute function public.handle_company_membership_decision();

-- Nieuwe aanvraag: notificeer iedereen die 'm mag goedkeuren (bestaande
-- leden van dat bedrijf + bestuur/beheerder).
create or replace function public.notify_company_membership_request()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_applicant_name text;
  v_company_name text;
begin
  select first_name || ' ' || last_name into v_applicant_name from public.profiles where id = new.profile_id;
  select name into v_company_name from public.companies where id = new.company_id;

  insert into public.notifications (profile_id, type, title, body, link)
  select distinct recipient_id, 'company_membership_request', 'Nieuwe bedrijfskoppeling ter goedkeuring',
    coalesce(v_applicant_name, 'Iemand') || ' wil gekoppeld worden aan ' || coalesce(v_company_name, 'een bedrijf') || '.',
    '/bedrijven/' || new.company_id
  from (
    select profile_id as recipient_id from public.company_members where company_id = new.company_id
    union
    select id as recipient_id from public.profiles where role in ('bestuurslid', 'beheerder')
  ) recipients
  where recipient_id <> new.profile_id;

  return new;
end;
$$;

create trigger company_membership_requests_notify
  after insert on public.company_membership_requests
  for each row execute function public.notify_company_membership_request();

-- De oude, ongecontroleerde self-insert op company_members verdwijnt: alleen
-- bestuur/beheerder mag nog rechtstreeks een company_members-rij aanmaken
-- (bijv. tijdens het handmatig corrigeren van een lidprofiel); voor gewone
-- leden loopt het voortaan altijd via de aanvraag hierboven.
drop policy "company_members_self_or_board_insert" on public.company_members;
create policy "company_members_board_insert" on public.company_members
  for insert with check (public.is_board());

-- Dezelfde ongecontroleerde koppeling gebeurde ook bij registratie: koos je
-- tijdens het aanmaken van je account een bestaand bedrijf, dan werd je daar
-- meteen (zonder goedkeuring) lid van. Een gloednieuw bedrijf aanmaken tijdens
-- registratie blijft direct lid maken (er is niemand om het goed te keuren,
-- en je legt het bedrijf zelf vast); een bestaand bedrijf kiezen wordt nu een
-- pending-aanvraag, net als later via het profiel.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_meta jsonb := new.raw_user_meta_data;
  v_token text := v_meta ->> 'invitation_token';
  v_invitation public.invitations;
  v_company_id uuid := nullif(v_meta ->> 'company_id', '')::uuid;
  v_new_company_name text := v_meta ->> 'new_company_name';
  v_created_company_id uuid;
begin
  if v_token is null then
    raise exception 'Registratie vereist een geldige uitnodiging.';
  end if;

  select * into v_invitation
    from public.invitations
    where token = v_token
    for update;

  if v_invitation is null
     or v_invitation.status <> 'pending'
     or v_invitation.expires_at < now()
  then
    raise exception 'Deze uitnodiging is ongeldig of verlopen.';
  end if;

  insert into public.profiles (id, first_name, last_name, email, phone, job_title, role)
  values (
    new.id,
    coalesce(v_meta ->> 'first_name', ''),
    coalesce(v_meta ->> 'last_name', ''),
    new.email,
    v_meta ->> 'phone',
    v_meta ->> 'job_title',
    v_invitation.role
  );

  if v_new_company_name is not null and v_new_company_name <> '' then
    insert into public.companies (name, slug, industry, website, city)
    values (
      v_new_company_name,
      lower(regexp_replace(v_new_company_name, '[^a-zA-Z0-9]+', '-', 'g')) || '-' || substr(new.id::text, 1, 8),
      v_meta ->> 'new_company_industry',
      v_meta ->> 'new_company_website',
      v_meta ->> 'new_company_city'
    )
    returning id into v_created_company_id;

    insert into public.company_members (company_id, profile_id) values (v_created_company_id, new.id);
  elsif v_company_id is not null then
    insert into public.company_membership_requests (company_id, profile_id) values (v_company_id, new.id);
  end if;

  update public.invitations
    set status = 'accepted', accepted_by = new.id, accepted_at = now()
    where id = v_invitation.id;

  return new;
end;
$$;
