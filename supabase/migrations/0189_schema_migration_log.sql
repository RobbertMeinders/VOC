-- Vangnet tegen "code staat klaar, werkt live niet": deze sessie brak dat
-- herhaald (slug-URL's 0163/0187, de cover-kolom-grant 0183, en nu
-- update_my_profile/0188 dat op de database stond maar niet door PostgREST
-- werd opgepikt zonder schema-reload). Twee onderdelen:
--
-- 1. schema_migration_log: een lichte, zelfonderhoudende ledger van welke
--    migraties daadwerkelijk op DEZE database zijn toegepast. Er bestaat
--    geen supabase_migrations.schema_migrations hier (migraties worden
--    handmatig via de SQL-editor gedraaid, niet via `supabase db push`),
--    dus zonder deze tabel is er geen betrouwbare manier om "staat dit al
--    live?" te beantwoorden zonder telkens ad-hoc information_schema-query's
--    te improviseren.
--
-- 2. NIEUWE CONVENTIE, VANAF DEZE MIGRATIE: elke volgende migratie sluit
--    voortaan af met twee standaardregels (pas het versienummer aan):
--
--      insert into public.schema_migration_log (version) values ('0190') on conflict (version) do nothing;
--      notify pgrst, 'reload schema';
--
--    De eerste regel houdt de ledger vanzelf actueel. De tweede voorkomt
--    exact de 0188-klasse fout: een nieuwe RPC/kolom die wél in de database
--    staat maar door PostgREST's schema-cache nog niet wordt herkend totdat
--    er een reload plaatsvindt.
--
-- Geen RLS-policies op deze tabel nodig (zelfde "bewust geen policies"-
-- patroon als company_slug_aliases, 0162): alleen migraties zelf en de
-- smalle SECURITY DEFINER-RPC hieronder lezen/schrijven 'm.
create table public.schema_migration_log (
  version text primary key,
  applied_at timestamptz not null default now()
);

alter table public.schema_migration_log enable row level security;

-- Eenmalige startstaat. 0001-0174 zijn deze hele sessie lang bevestigd live
-- en functionerend (het portaal draait er al die tijd op) -- onvoorwaardelijk
-- toegevoegd i.p.v. elk apart te detecteren.
insert into public.schema_migration_log (version)
select lpad(n::text, 4, '0') from generate_series(1, 174) as n
on conflict (version) do nothing;

-- 0175-0188: detectie op een kenmerkend database-object per migratie, zelfde
-- aanpak als de ad-hoc information_schema-controles eerder deze sessie.
-- Elke insert hieronder is onafhankelijk guarded -- geen enkele veronderstelt
-- dat een eerdere migratie al aanwezig is, want dat is precies wat deze
-- migratie moet VASTSTELLEN, niet aannemen.
do $$
begin
  -- 0175: companies.membership_status (+ member_since/membership_end_date, zelfde migratie)
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'companies' and column_name = 'membership_status'
  ) then
    insert into public.schema_migration_log (version) values ('0175') on conflict (version) do nothing;
  end if;

  -- 0176: opzegflow-functies
  if exists (
    select 1 from information_schema.routines
    where routine_schema = 'public' and routine_name = 'request_company_cancellation'
  ) then
    insert into public.schema_migration_log (version) values ('0176') on conflict (version) do nothing;
  end if;

  -- 0177: cron-afrondfunctie
  if exists (
    select 1 from information_schema.routines
    where routine_schema = 'public' and routine_name = 'process_company_membership_cancellations'
  ) then
    insert into public.schema_migration_log (version) values ('0177') on conflict (version) do nothing;
  end if;

  -- 0178: companies_for_members() bestaat (als RPC-functie i.p.v. view sinds 0158;
  -- deze migratie breidde 'm uit met de membership-kolommen)
  if exists (
    select 1 from information_schema.routines
    where routine_schema = 'public' and routine_name = 'companies_for_members'
  ) then
    insert into public.schema_migration_log (version) values ('0178') on conflict (version) do nothing;
  end if;

  -- 0179: ledenexport-RPC
  if exists (
    select 1 from information_schema.routines
    where routine_schema = 'public' and routine_name = 'get_members_export'
  ) then
    insert into public.schema_migration_log (version) values ('0179') on conflict (version) do nothing;
  end if;

  -- 0180: privacy-defaults + twee dismissed-at-kolommen
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'profiles' and column_name = 'contact_visibility_prompt_dismissed_at'
  ) and exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'companies' and column_name = 'address_visibility_prompt_dismissed_at'
  ) then
    insert into public.schema_migration_log (version) values ('0180') on conflict (version) do nothing;
  end if;

  -- 0181: get_member_profile() geeft contact_visibility_prompt_dismissed_at terug (OUT-parameter)
  if exists (
    select 1 from information_schema.parameters p
    join information_schema.routines r on r.specific_name = p.specific_name and r.specific_schema = p.specific_schema
    where r.routine_schema = 'public' and r.routine_name = 'get_member_profile'
      and p.parameter_name = 'contact_visibility_prompt_dismissed_at'
  ) then
    insert into public.schema_migration_log (version) values ('0181') on conflict (version) do nothing;
  end if;

  -- 0182: companies_for_members() geeft address_visibility_prompt_dismissed_at terug
  if exists (
    select 1 from information_schema.parameters p
    join information_schema.routines r on r.specific_name = p.specific_name and r.specific_schema = p.specific_schema
    where r.routine_schema = 'public' and r.routine_name = 'companies_for_members'
      and p.parameter_name = 'address_visibility_prompt_dismissed_at'
  ) then
    insert into public.schema_migration_log (version) values ('0182') on conflict (version) do nothing;
  end if;

  -- 0183: cover_url-kolommen
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'profiles' and column_name = 'cover_url'
  ) and exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'companies' and column_name = 'cover_url'
  ) then
    insert into public.schema_migration_log (version) values ('0183') on conflict (version) do nothing;
  end if;

  -- 0184: companies_for_members() geeft cover_url terug
  if exists (
    select 1 from information_schema.parameters p
    join information_schema.routines r on r.specific_name = p.specific_name and r.specific_schema = p.specific_schema
    where r.routine_schema = 'public' and r.routine_name = 'companies_for_members'
      and p.parameter_name = 'cover_url'
  ) then
    insert into public.schema_migration_log (version) values ('0184') on conflict (version) do nothing;
  end if;

  -- 0185: get_member_profile() geeft cover_url terug
  if exists (
    select 1 from information_schema.parameters p
    join information_schema.routines r on r.specific_name = p.specific_name and r.specific_schema = p.specific_schema
    where r.routine_schema = 'public' and r.routine_name = 'get_member_profile'
      and p.parameter_name = 'cover_url'
  ) then
    insert into public.schema_migration_log (version) values ('0185') on conflict (version) do nothing;
  end if;

  -- 0186: companies-kolomrechten-RPC
  if exists (
    select 1 from information_schema.routines
    where routine_schema = 'public' and routine_name = 'set_company_membership_status'
  ) then
    insert into public.schema_migration_log (version) values ('0186') on conflict (version) do nothing;
  end if;

  -- 0187: pure databackfill, geen eigen database-object om te detecteren.
  -- Beste-poging-heuristiek: geen enkel bedrijf heeft nog de oude
  -- willekeurige-staart-slugvorm. Minder waterdicht dan de andere checks
  -- hierboven (een nieuw bedrijf met toevallig zo'n slug zou dit vals-negatief
  -- laten lijken), maar dat scenario is extreem onwaarschijnlijk.
  if not exists (
    select 1 from public.companies where slug ~ '^.+-[0-9a-f]{8}$'
  ) then
    insert into public.schema_migration_log (version) values ('0187') on conflict (version) do nothing;
  end if;

  -- 0188: profiel-opslaan-RPC
  if exists (
    select 1 from information_schema.routines
    where routine_schema = 'public' and routine_name = 'update_my_profile'
  ) then
    insert into public.schema_migration_log (version) values ('0188') on conflict (version) do nothing;
  end if;
end;
$$;

-- Admin-gated RPC: welke versies staan in de ledger? Alleen een lijst van
-- versienummers, geen gevoelige data -- maar net als andere Beheer-RPC's
-- (zie get_members_export, 0179) toch achter is_admin() i.p.v. breed
-- opengezet, met hetzelfde expliciete weigerpatroon.
create function public.get_applied_migration_versions()
returns setof text
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'not authorized';
  end if;

  return query select version from public.schema_migration_log order by version;
end;
$$;

grant execute on function public.get_applied_migration_versions() to authenticated;

insert into public.schema_migration_log (version) values ('0189') on conflict (version) do nothing;
notify pgrst, 'reload schema';
