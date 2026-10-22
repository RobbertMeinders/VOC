-- companies_for_members() (laatst herdefinieerd in 0178) gaf
-- address_visibility_prompt_dismissed_at (nieuw in
-- 0180_privacy_defaults_hidden.sql) nog niet terug, waardoor
-- AddressVisibilityPrompt (CompanyProfileContent) dat veld altijd als
-- undefined zou lezen en de prompt na "Niet nu" telkens opnieuw zou
-- tonen. "create or replace" kan de return-kolommen van een functie niet
-- uitbreiden, dus eerst droppen — zelfde volgorde als 0178 zelf.
drop function if exists public.companies_for_members();

create function public.companies_for_members()
returns table (
  id uuid, name text, slug text, logo_url text, logo_thumb_url text,
  description text, tagline text, industry text, website text, city text,
  address text, postal_code text, show_address boolean, phone text, email text,
  latitude double precision, longitude double precision,
  linkedin_url text, instagram_url text, facebook_url text,
  is_publicly_visible boolean, created_by uuid,
  created_at timestamptz, updated_at timestamptz,
  membership_status text, member_since date, membership_end_date date,
  address_visibility_prompt_dismissed_at timestamptz
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
    c.created_by, c.created_at, c.updated_at,
    c.membership_status, c.member_since, c.membership_end_date,
    c.address_visibility_prompt_dismissed_at
  from public.companies c
  where public.is_active_member();
$$;

grant execute on function public.companies_for_members() to authenticated;
