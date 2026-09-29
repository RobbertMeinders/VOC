-- Vervolg op 0053_public_directory_polish.sql: die faalde op het laatste
-- onderdeel (CREATE OR REPLACE mag de kolomset van een RETURNS TABLE-
-- functie niet wijzigen — vereist eerst een DROP). De eerdere onderdelen
-- van 0053 (medewerkers-default, storage-policy) waren al gelukt, dus
-- alleen dit laatste stuk hier los, zodat je 0053 niet opnieuw hoeft te
-- draaien (dat zou nu vastlopen op "policy already exists").
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
