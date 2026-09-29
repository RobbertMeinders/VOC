-- Onderdeel B: openbare bedrijvengids-embed (zie /embed/bedrijven). Zelfde
-- opt-in-principe als de agenda: een bedrijf is standaard NIET publiek
-- zichtbaar, en een medewerker is standaard NIET met naam+functie zichtbaar
-- op de publieke pagina van het eigen bedrijf — allebei bewust default
-- false, moet expliciet aangezet worden.
alter table public.companies add column if not exists is_publicly_visible boolean not null default false;
alter table public.profiles add column if not exists publicly_visible boolean not null default false;

-- Mirror van set_company_show_address (0036_company_show_address.sql):
-- companies_board_update (RLS) beperkt UPDATE op companies tot bestuur/
-- beheer, maar dit schuifje moet ook los vanaf de instellingenpagina te
-- zetten zijn door een gewoon lid van dát bedrijf. Smalle, specifieke
-- security-definer-functie i.p.v. de RLS-policy te verruimen.
create or replace function public.set_company_publicly_visible(p_company_id uuid, p_visible boolean)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not (
    public.is_board()
    or exists (
      select 1 from public.company_members
      where company_id = p_company_id and profile_id = auth.uid()
    )
  ) then
    raise exception 'not authorized';
  end if;

  update public.companies set is_publicly_visible = p_visible where id = p_company_id;
end;
$$;

grant execute on function public.set_company_publicly_visible(uuid, boolean) to authenticated;

-- Publieke, anonieme leesfuncties i.p.v. een RLS SELECT-policy op companies/
-- profiles zelf: RLS werkt op rijniveau, niet op kolomniveau, dus een
-- publieke SELECT-policy zou ook telefoon/e-mail/adres blootstellen. Deze
-- functies geven bewust alleen de expliciet voor de openbare site bedoelde
-- velden terug (zie de eerdere ontwerp-discussie: naam, logo, branche,
-- plaats, omschrijving, website, social-links — nooit contactgegevens).
create or replace function public.get_public_companies()
returns table (
  id uuid,
  slug text,
  name text,
  logo_url text,
  tagline text,
  industry text,
  city text
)
language sql
security definer
set search_path = public
stable
as $$
  select id, slug, name, logo_url, tagline, industry, city
  from public.companies
  where is_publicly_visible = true
  order by name;
$$;

grant execute on function public.get_public_companies() to anon, authenticated;

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
                 'job_title', p.job_title
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
