-- Openbare agenda-embed: niet-leden mogen zich aanmelden voor een activiteit
-- zonder account, met naam + e-mailadres + optioneel bedrijfsnaam. Bewust
-- een eigen, losse tabel i.p.v. activity_registrations uitbreiden — die
-- tabel gaat overal van uit dat er een echt lidprofiel achter zit
-- (wachtlijst, herinneringen, aanwezigheid) en dat willen we niet aanraken.
-- Geen koppeling aan public.profiles: e-mail is geen betrouwbaar
-- identiteitsbewijs, dus nooit automatisch matchen aan een bestaand lid.

alter table public.activities
  add column allow_public_registration boolean not null default false;

create table public.public_activity_registrations (
  id uuid primary key default gen_random_uuid(),
  activity_id uuid not null references public.activities (id) on delete cascade,
  name text not null,
  email text not null,
  company_name text,
  created_at timestamptz not null default now(),
  unique (activity_id, email)
);

create index public_activity_registrations_activity_idx on public.public_activity_registrations (activity_id);

alter table public.public_activity_registrations enable row level security;

-- Alleen aanmelden bij een goedgekeurde activiteit die daar expliciet voor
-- openstaat — voorkomt dat iemand via de publieke pagina alsnog op een
-- pending/afgewezen of "alleen leden"-activiteit terechtkomt.
create policy "public_activity_registrations_insert" on public.public_activity_registrations
  for insert to anon, authenticated
  with check (
    exists (
      select 1 from public.activities a
      where a.id = activity_id and a.status = 'approved' and a.allow_public_registration
    )
  );

-- Nogmaals aanmelden met hetzelfde e-mailadres werkt als "gegevens
-- bijwerken" (upsert op de unique (activity_id, email)), geen foutmelding.
-- Er is geen accountsysteem hierachter om "eigenaarschap" op te toetsen, dus
-- using(true) hier is bewust: wie het formulier opnieuw invult met hetzelfde
-- adres, mag de eerdere inzending overschrijven — dezelfde lichte
-- gevoeligheid als het gewoon opnieuw mogen inzenden via de insert-policy.
create policy "public_activity_registrations_update" on public.public_activity_registrations
  for update to anon, authenticated
  using (true)
  with check (
    exists (
      select 1 from public.activities a
      where a.id = activity_id and a.status = 'approved' and a.allow_public_registration
    )
  );

-- De ruwe rijen (naam/e-mail) zijn nooit publiek leesbaar — alleen
-- bestuur/beheer, straks voor het "potentiële leden"-overzicht in Beheer.
create policy "public_activity_registrations_board_select" on public.public_activity_registrations
  for select using (public.is_board());

-- Smal, publiek aantal — nooit de rijen zelf. Telt leden- én publieke
-- aanmeldingen (incl. wachtlijst) bij elkaar op: een bezoeker hoeft het
-- verschil niet te weten, "X aanmeldingen" is genoeg.
create or replace function public.get_activity_interest_count(p_activity_id uuid)
returns integer
language sql
stable
security definer
set search_path = public
as $$
  select
    (select count(*) from public.activity_registrations where activity_id = p_activity_id)
    + (select count(*) from public.public_activity_registrations where activity_id = p_activity_id);
$$;

grant execute on function public.get_activity_interest_count(uuid) to anon, authenticated;
