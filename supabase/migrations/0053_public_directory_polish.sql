-- Drie bijstellingen op de bedrijvengids-embed (0050/0052), na eerste
-- live-test:

-- 1) Zelfde bijstelling als 0052, nu voor de naam+functie-zichtbaarheid
-- van medewerkers: ook standaard aan (opt-out i.p.v. opt-in) — nog altijd
-- per persoon uit te zetten op Instellingen, dat blijft bewust een
-- individuele keuze.
alter table public.profiles alter column publicly_visible set default true;
update public.profiles set publicly_visible = true where publicly_visible = false;

-- 2) storage.objects had alleen een members-only leesregel voor
-- company-logos (company_logos_select, 0002_storage.sql) — logo's van
-- publiek-zichtbare bedrijven moeten ook door een anonieme bezoeker van de
-- bedrijvengids-embed geladen kunnen worden. Aparte, smalle policy i.p.v.
-- de bestaande policy aan te passen: alleen logo's van bedrijven met
-- is_publicly_visible = true worden hierdoor vrijgegeven, de rest blijft
-- members-only. storage.foldername(name) geeft de padsegmenten terug —
-- eerste segment is de company_id (pad: company-logos/{company_id}/{file}).
create policy "company_logos_public_select" on storage.objects
  for select
  using (
    bucket_id = 'company-logos'
    and exists (
      select 1 from public.companies
      where id::text = (storage.foldername(name))[1]
        and is_publicly_visible = true
    )
  );

-- 3) get_public_companies() uitgebreid met latitude/longitude, alleen
-- wanneer het bedrijf zelf z'n adres toont (companies.show_address) —
-- dezelfde voorwaarde die de interne /bedrijven-kaart al hanteert. Zo komt
-- een verborgen adres nooit als kaart-marker naar buiten, ook al is de
-- rest van het profiel publiek.
--
-- drop eerst: CREATE OR REPLACE mag de kolomset van een RETURNS TABLE-
-- functie niet wijzigen (Postgres-foutmelding 42P13 "cannot change return
-- type of existing function" — de bestaande get_public_companies() uit
-- 0050 had nog geen latitude/longitude).
drop function if exists public.get_public_companies();

create or replace function public.get_public_companies()
returns table (
  id uuid,
  slug text,
  name text,
  logo_url text,
  tagline text,
  industry text,
  city text,
  latitude double precision,
  longitude double precision
)
language sql
security definer
set search_path = public
stable
as $$
  select
    id, slug, name, logo_url, tagline, industry, city,
    case when show_address then latitude else null end,
    case when show_address then longitude else null end
  from public.companies
  where is_publicly_visible = true
  order by name;
$$;

grant execute on function public.get_public_companies() to anon, authenticated;
