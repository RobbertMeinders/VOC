-- URL-ronde: get_companies_directory() (M8, 0145) gaf geen slug terug —
-- de ledenbedrijvengids-kaart (bedrijven/page.tsx) kon zo nooit naar de
-- nette slug-URL linken, alleen naar de kale UUID.
--
-- Postgres staat "create or replace function" niet toe als de OUT-rijvorm
-- verandert (hier: een extra slug-kolom) — eerst droppen is verplicht,
-- anders faalt dit met 42P13 ("cannot change return type of existing
-- function").
drop function if exists public.get_companies_directory();

create function public.get_companies_directory()
returns table (
  id uuid, slug text, name text, industry text, city text, logo_url text,
  logo_thumb_url text, tagline text, latitude double precision,
  longitude double precision, show_address boolean
)
language sql
stable
security definer
set search_path = public
as $$
  select
    id, slug, name, industry, city, logo_url, logo_thumb_url, tagline,
    case when show_address then latitude else null end,
    case when show_address then longitude else null end,
    show_address
  from public.companies
  where public.is_active_member()
  order by name;
$$;

-- DROP FUNCTION hierboven wist ook de bestaande grant uit 0145 — en sinds
-- H4 (0144, default-dicht voor nieuwe functies) krijgt een opnieuw
-- aangemaakte functie niet eens meer automatisch de oude PUBLIC-toegang;
-- zonder deze regel zou de ledenbedrijvengids-kaart na deze migratie met
-- "permission denied" breken.
grant execute on function public.get_companies_directory() to authenticated;
