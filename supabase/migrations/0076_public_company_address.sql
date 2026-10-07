-- UX-review W2: de openbare bedrijvengids-embed (get_public_company, zie
-- 0050/0056) toont tagline, omschrijving, logo, socials en medewerkers al,
-- maar nooit het adres — zelfs niet als het bedrijf dat met show_address
-- expliciet toestaat op de eigen bedrijfspagina. Dezelfde voorwaarde hier
-- herhalen (net als overal elders, bv. /bedrijven/page.tsx voor de kaart).
drop function if exists public.get_public_company(text);

create function public.get_public_company(p_slug text)
returns table (
  id uuid,
  slug text,
  name text,
  logo_url text,
  tagline text,
  description text,
  industry text,
  city text,
  address text,
  postal_code text,
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
    case when c.show_address then c.address else null end,
    case when c.show_address then c.postal_code else null end,
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
