-- Het account van de VOC zelf (gebruikt om als organisatie in de feed te
-- reageren/posten) is een gewoon profiel-account, en verscheen daardoor
-- gewoon tussen de echte leden in /leden, Netwerk -> Leden en de
-- zoekresultaten — verwarrend, want het is geen collega om op te zoeken.
-- Deze kolom laat bestuur/beheer zo'n account markeren zonder de rol
-- (rechten) of enige andere functionaliteit aan te tasten: inloggen,
-- posten, reageren en @genoemd worden blijven gewoon werken, het account
-- verdwijnt alleen uit de ledenlijst/zoekresultaten.

alter table public.profiles
  add column is_organization_account boolean not null default false;
