-- guard_link_url_scheme() (0151) valideert linkedin_url/instagram_url/
-- facebook_url alledrie in de functiebody, maar de trigger op profiles
-- vuurde alleen op een wijziging van linkedin_url — een update die
-- uitsluitend instagram_url of facebook_url zet, sloeg de validatie dus
-- over en kon zo een "javascript:"-URI opslaan (opgeslagen XSS zodra die
-- als <a href> wordt getoond). De trigger op companies dekte alle vier
-- kolommen al correct; deze migratie trekt profiles gelijk.
drop trigger if exists profiles_guard_link_url_scheme on public.profiles;

create trigger profiles_guard_link_url_scheme
  before insert or update of linkedin_url, instagram_url, facebook_url on public.profiles
  for each row execute function public.guard_link_url_scheme();
