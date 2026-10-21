-- Beveiligingsfixlijst Blok 3, Laag: linkedin_url/instagram_url/facebook_url
-- (profiles, companies) en companies.website hadden alleen client-side
-- validatie (validateUrl in de formulieren) — een directe POST voorbij die
-- formulieren om kon er bv. een "javascript:"-URI in zetten. Deze velden
-- worden overal rechtstreeks als <a href> getoond (EntitySocialLinks,
-- CompanyHeader, embed/CompanyDetailContent) — een niet-http(s)-schema zou
-- daarmee als opgeslagen XSS uitvoeren zodra iemand de link aanklikt.
-- Eén generieke trigger i.p.v. elke server action los aan te passen: dekt
-- ook het pad via handle_new_user() (nieuw bedrijf bij registratie) en een
-- eventuele toekomstige aanroeper in één keer. Zet een ongeldige waarde
-- stil terug naar NULL — zelfde conventie als guard_profile_privileges
-- voor een kolom die niet op deze manier gezet had mogen worden.
create or replace function public.guard_link_url_scheme()
returns trigger
language plpgsql
as $$
begin
  if new.linkedin_url is not null and new.linkedin_url !~* '^https?://\S+\.\S+' then
    new.linkedin_url := null;
  end if;
  if new.instagram_url is not null and new.instagram_url !~* '^https?://\S+\.\S+' then
    new.instagram_url := null;
  end if;
  if new.facebook_url is not null and new.facebook_url !~* '^https?://\S+\.\S+' then
    new.facebook_url := null;
  end if;
  if TG_TABLE_NAME = 'companies' and new.website is not null and new.website !~* '^https?://\S+\.\S+' then
    new.website := null;
  end if;
  return new;
end;
$$;

create trigger profiles_guard_link_url_scheme
  before insert or update of linkedin_url on public.profiles
  for each row execute function public.guard_link_url_scheme();

create trigger companies_guard_link_url_scheme
  before insert or update of website, linkedin_url, instagram_url, facebook_url on public.companies
  for each row execute function public.guard_link_url_scheme();
