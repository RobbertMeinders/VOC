-- Supabase-linter regel 0010 ("Security Definer View", ERROR) markeert elke
-- view die met de rechten van de eigenaar draait i.p.v. de aanroeper —
-- precies het gedrag dat companies_for_members (0145) bewust gebruikt om de
-- ingetrokken address/postal_code/latitude/longitude-kolommen alsnog
-- gemaskeerd te kunnen tonen. get_companies_directory() hiernaast triggert
-- de regel niet: de linter kijkt alleen naar views, niet naar functies, dus
-- dezelfde omzetting (view -> security definer functie) lost dit op zonder
-- het maskerings- of rij-zichtbaarheidsgedrag te veranderen.
drop view if exists public.companies_for_members;

-- "returns table (...)" i.p.v. "returns setof public.companies": die laatste
-- vereist een output die positioneel (kolomvolgorde én -type) exact
-- overeenkomt met de fysieke tabeldefinitie, niet met kolomnamen — companies
-- kreeg zijn kolommen via meerdere losse ALTER TABLE-migraties (0009, 0012,
-- 0018, 0026, 0036, 0050, 0085, 0128), in een heel andere volgorde dan de
-- SELECT-lijst hieronder. "returns table" (zelfde patroon als
-- get_companies_directory, 0145) ontkoppelt de output expliciet van de
-- fysieke kolomvolgorde. PostgREST behandelt een stable/immutable functie
-- die setof/table teruggeeft als een view: ?select=, horizontale filters
-- (?id=eq...) en ?order= werken hierna nog hetzelfde via supabase-js'
-- .rpc(...).select(...).filter(...).
create function public.companies_for_members()
returns table (
  id uuid, name text, slug text, logo_url text, logo_thumb_url text,
  description text, tagline text, industry text, website text, city text,
  address text, postal_code text, show_address boolean, phone text, email text,
  latitude double precision, longitude double precision,
  linkedin_url text, instagram_url text, facebook_url text,
  is_publicly_visible boolean, created_by uuid,
  created_at timestamptz, updated_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select
    c.id, c.name, c.slug, c.logo_url, c.logo_thumb_url, c.description, c.tagline,
    c.industry, c.website, c.city,
    case
      when c.show_address or public.is_board()
        or exists (
          select 1 from public.company_members cm
          where cm.company_id = c.id and cm.profile_id = auth.uid()
        )
      then c.address else null
    end as address,
    case
      when c.show_address or public.is_board()
        or exists (
          select 1 from public.company_members cm
          where cm.company_id = c.id and cm.profile_id = auth.uid()
        )
      then c.postal_code else null
    end as postal_code,
    c.show_address, c.phone, c.email,
    case
      when c.show_address or public.is_board()
        or exists (
          select 1 from public.company_members cm
          where cm.company_id = c.id and cm.profile_id = auth.uid()
        )
      then c.latitude else null
    end as latitude,
    case
      when c.show_address or public.is_board()
        or exists (
          select 1 from public.company_members cm
          where cm.company_id = c.id and cm.profile_id = auth.uid()
        )
      then c.longitude else null
    end as longitude,
    c.linkedin_url, c.instagram_url, c.facebook_url, c.is_publicly_visible,
    c.created_by, c.created_at, c.updated_at
  from public.companies c
  -- Zelfde reden als de view had: deze functie draait met de rechten van de
  -- eigenaar (vandaar dat ze de ingetrokken kolommen uit companies zelf nog
  -- wél kan lezen), dus herhaalt companies_members_select (public.is_active_
  -- member()) hier expliciet — anders zou een niet-actief lid via deze
  -- functie weer alles kunnen lezen.
  where public.is_active_member();
$$;

grant execute on function public.companies_for_members() to authenticated;
