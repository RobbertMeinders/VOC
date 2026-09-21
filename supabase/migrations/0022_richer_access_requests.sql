-- Eigen, embeddable aanmeldformulier (vervangt het externe WordPress-
-- formulier): vraagt iets meer dan naam/e-mail/toelichting, en notificeert
-- bestuur/beheer meteen zodat een aanvraag niet alleen via de teller op
-- /beheer wordt opgemerkt.
--
-- Defensief: op sommige omgevingen bleek 0004_access_requests.sql niet
-- (meer) toegepast te zijn ("relation public.access_requests does not
-- exist"), terwijl latere migraties die er wél van uitgaan wel liepen. Dit
-- blok herstelt de tabel dan alsnog, exact volgens de oorspronkelijke
-- 0004-architectuur (zelfde kolommen, index en RLS-policies) — geen nieuwe
-- tabelstructuur, alleen een idempotente vangnet-creatie. Was 0004 al wel
-- toegepast, dan doet dit blok niets (if not exists).
create table if not exists public.access_requests (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null,
  message text,
  status text not null default 'pending' check (status in ('pending', 'handled')),
  created_at timestamptz not null default now()
);

create index if not exists access_requests_status_idx on public.access_requests (status, created_at desc);

alter table public.access_requests enable row level security;

drop policy if exists "access_requests_public_insert" on public.access_requests;
create policy "access_requests_public_insert" on public.access_requests
  for insert with check (true);

drop policy if exists "access_requests_board_select" on public.access_requests;
create policy "access_requests_board_select" on public.access_requests
  for select using (public.is_board());

drop policy if exists "access_requests_board_update" on public.access_requests;
create policy "access_requests_board_update" on public.access_requests
  for update using (public.is_board());

alter table public.access_requests
  add column if not exists phone text,
  add column if not exists company_name text,
  add column if not exists job_title text;

create or replace function public.notify_access_request()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.notifications (profile_id, type, title, body, link)
  select id, 'access_request', 'Nieuwe aanmelding',
    new.name || ' heeft toegang aangevraagd voor het ledenportaal.',
    '/beheer/aanvragen'
  from public.profiles
  where is_active and role in ('bestuurslid', 'beheerder');
  return new;
end;
$$;

drop trigger if exists access_requests_notify on public.access_requests;
create trigger access_requests_notify
  after insert on public.access_requests
  for each row execute function public.notify_access_request();
