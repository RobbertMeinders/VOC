-- Onderdeel C: potentiële leden ("prospects") — bestuur wil een actueel
-- overzicht bijhouden van niet-leden die zich via de openbare agenda hebben
-- aangemeld (public_activity_registrations, 0047), met een status
-- (wil lid worden / wil niet lid worden / geen antwoord) om een follow-up
-- te kunnen sturen. Eén rij per e-mailadres (niet per aanmelding): dezelfde
-- persoon kan zich voor meerdere activiteiten aanmelden, maar heeft maar
-- één actuele status.
create table public.prospects (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  name text not null,
  company_name text,
  status text not null default 'nog_te_beoordelen'
    check (status in ('nog_te_beoordelen', 'wil_lid_worden', 'wil_niet_lid_worden', 'geen_antwoord')),
  status_note text,
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  status_updated_at timestamptz,
  status_updated_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

alter table public.prospects enable row level security;

create policy prospects_board_select on public.prospects
  for select to authenticated
  using (public.is_board());

create policy prospects_board_update on public.prospects
  for update to authenticated
  using (public.is_board());

-- Vult/ververst prospects automatisch bij elke openbare aanmelding — geen
-- aparte actie nodig vanuit registerPublicForActivityAction (agenda/actions.ts).
-- Naam/bedrijfsnaam worden bijgewerkt naar de laatst ingevulde waarde, maar
-- een al door het bestuur gezette status blijft ongemoeid.
create or replace function public.sync_prospect_from_public_registration()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.prospects (email, name, company_name, last_seen_at)
  values (lower(new.email), new.name, new.company_name, now())
  on conflict (email) do update set
    name = excluded.name,
    company_name = coalesce(excluded.company_name, public.prospects.company_name),
    last_seen_at = now();
  return new;
end;
$$;

create trigger trg_sync_prospect_from_public_registration
  after insert or update on public.public_activity_registrations
  for each row execute function public.sync_prospect_from_public_registration();

-- Backfill: bestaande openbare aanmeldingen (van vóór deze migratie) meteen
-- als prospect opnemen i.p.v. pas bij hun volgende aanmelding.
insert into public.prospects (email, name, company_name, first_seen_at, last_seen_at)
select
  lower(email),
  (array_agg(name order by created_at desc))[1],
  (array_agg(company_name order by created_at desc))[1],
  min(created_at),
  max(created_at)
from public.public_activity_registrations
group by lower(email)
on conflict (email) do nothing;

-- Bewaartermijn: zelfde 90-dagenprincipe als de bestaande ledenanonimisering
-- (anonymize_expired_profiles, 0037_retention_and_push_preferences.sql) —
-- hier gemeten vanaf de laatste aanmelding (last_seen_at), niet vanaf een
-- statuswijziging, zodat een actieve prospect nooit per ongeluk verdwijnt.
create or replace function public.delete_expired_prospects()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  deleted_count integer;
begin
  delete from public.prospects where last_seen_at <= now() - interval '90 days';
  get diagnostics deleted_count = row_count;
  return deleted_count;
end;
$$;

grant execute on function public.delete_expired_prospects() to anon, authenticated;
