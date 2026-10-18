-- G2: companies_member_update (0083_company_billing_details.sql) geeft elk
-- gekoppeld lid bewust volledige bewerkrechten op het eigen bedrijf — dat
-- was een expliciete eerdere keuze en blijft zo (zie o.a.
-- set_company_publicly_visible, 0050, die is_publicly_visible ook al
-- bewust voor een gewoon lid opent). Maar "elke kolom" omvatte zo ook
-- slug: die bepaalt de publieke/embed-URL van het bedrijf
-- (/embed/bedrijven/[slug], /api/embed/companies/[slug]) en staat nergens
-- in CompanyForm — geen enkel UI-pad biedt 'm aan, dus hij kon alleen via
-- een rechtstreekse aanroep buiten de app om gewijzigd worden, met alle
-- kapotte opgeslagen links/embeds als gevolg. Blijft, net als role/
-- is_active op profiles (guard_profile_privileges), uitsluitend voor
-- bestuur/beheer.
create or replace function public.guard_company_privileges()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_board() then
    new.slug := old.slug;
  end if;
  return new;
end;
$$;

create trigger companies_guard_privileges
  before update on public.companies
  for each row execute function public.guard_company_privileges();
