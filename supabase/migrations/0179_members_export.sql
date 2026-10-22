-- Ledenexport (lidmaatschap-traject Deel 2): één RPC die alles teruggeeft
-- wat de .xlsx-/CSV-export nodig heeft, in de ruwste vorm (één rij per
-- contactpersoon, bedrijfsvelden herhaald) — de route-handlers aggregeren
-- dit in TypeScript naar "één rij per bedrijf" voor de .xlsx, en gebruiken
-- het rechtstreeks voor de volledige CSV-backup.
--
-- Alleen beheerders (role=beheerder), NIET elk bestuurslid — vandaar
-- public.is_admin() i.p.v. public.is_board(), en een plpgsql-functie die
-- bij een niet-beheerder expliciet weigert (zelfde "raise exception 'not
-- authorized'"-patroon als de Deel-1-functies in 0175/0176), i.p.v. alleen
-- rijen weg te filteren. profiles.email/phone zijn kolom-gerevoked voor
-- authenticated (0062) — deze security-definer-functie leest ze met de
-- rechten van de functie-eigenaar, bewust ONGEMASKEERD (geen
-- show_email/show_phone-check): dit is een beheerexport, geen
-- ledenweergave, en is_admin() is zelf al de autorisatiegrens.
create or replace function public.get_members_export()
returns table (
  company_id uuid,
  company_name text,
  company_slug text,
  membership_status text,
  member_since date,
  membership_end_date date,
  company_address text,
  company_postal_code text,
  company_city text,
  company_email text,
  company_phone text,
  company_website text,
  contact_profile_id uuid,
  contact_first_name text,
  contact_last_name text,
  contact_email text,
  contact_phone text,
  contact_job_title text,
  contact_is_primary boolean
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'not authorized';
  end if;

  return query
    select
      c.id, c.name, c.slug, c.membership_status, c.member_since, c.membership_end_date,
      c.address, c.postal_code, c.city, c.email, c.phone, c.website,
      cm.profile_id, p.first_name, p.last_name, p.email, p.phone, p.job_title, cm.is_primary
    from public.companies c
    left join public.company_members cm on cm.company_id = c.id
    left join public.profiles p on p.id = cm.profile_id
    order by c.name, cm.is_primary desc nulls last, p.last_name;
end;
$$;

grant execute on function public.get_members_export() to authenticated;
