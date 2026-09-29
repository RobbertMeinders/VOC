-- Root cause van de nog altijd ontbrekende logo's: company_logos_public_select
-- (0053/0055) deed `exists (select 1 from public.companies where ...)`
-- rechtstreeks — die subquery draait als de aanroepende rol (anon), en is
-- dus zélf weer onderworpen aan companies' eigen RLS (die anon nergens
-- leestoegang geeft, precies waarom get_public_companies() als aparte
-- security-definer-RPC bestaat i.p.v. een publieke SELECT-policy). Het
-- gevolg: de exists-check gaf voor iedereen altijd false, ongeacht
-- is_publicly_visible. Zelfde patroon als is_board()/is_active_member()
-- (0001_init.sql): een security-definer-functie omzeilt companies' RLS
-- wél, dus de storage-policy roept nu die aan i.p.v. rechtstreeks te
-- query'en.
create or replace function public.is_public_company(p_company_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.companies where id = p_company_id and is_publicly_visible = true);
$$;

grant execute on function public.is_public_company(uuid) to anon, authenticated;

drop policy if exists "company_logos_public_select" on storage.objects;

create policy "company_logos_public_select" on storage.objects
  for select
  using (
    bucket_id = 'company-logos'
    and public.is_public_company(((storage.foldername(name))[1])::uuid)
  );

-- Profielfoto's van medewerkers die zelf zichtbaar zijn (publicly_visible)
-- én bij een publiek bedrijf werken, mogen ook getoond worden op de
-- bedrijvengids-embed (zie get_public_company hieronder) — zelfde
-- exists-in-security-definer-functie-patroon, nu voor profiles+
-- company_members.
create or replace function public.is_public_employee(p_profile_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles p
    join public.company_members cm on cm.profile_id = p.id
    join public.companies c on c.id = cm.company_id
    where p.id = p_profile_id
      and p.publicly_visible = true
      and c.is_publicly_visible = true
  );
$$;

grant execute on function public.is_public_employee(uuid) to anon, authenticated;

create policy "avatars_public_select" on storage.objects
  for select
  using (
    bucket_id = 'avatars'
    and public.is_public_employee(((storage.foldername(name))[1])::uuid)
  );

-- get_public_company() uitgebreid met avatar_url per medewerker.
drop function if exists public.get_public_company(text);

create or replace function public.get_public_company(p_slug text)
returns table (
  id uuid,
  slug text,
  name text,
  logo_url text,
  tagline text,
  description text,
  industry text,
  city text,
  website text,
  linkedin_url text,
  instagram_url text,
  facebook_url text,
  employees jsonb
)
language sql
security definer
set search_path = public
stable
as $$
  select
    c.id, c.slug, c.name, c.logo_url, c.tagline, c.description, c.industry, c.city,
    c.website, c.linkedin_url, c.instagram_url, c.facebook_url,
    coalesce(
      (
        select jsonb_agg(jsonb_build_object(
                 'id', p.id,
                 'first_name', p.first_name,
                 'last_name', p.last_name,
                 'job_title', p.job_title,
                 'avatar_url', p.avatar_url
               ) order by p.first_name)
        from public.company_members cm
        join public.profiles p on p.id = cm.profile_id
        where cm.company_id = c.id and p.publicly_visible = true and p.is_active = true
      ),
      '[]'::jsonb
    ) as employees
  from public.companies c
  where c.slug = p_slug and c.is_publicly_visible = true;
$$;

grant execute on function public.get_public_company(text) to anon, authenticated;
