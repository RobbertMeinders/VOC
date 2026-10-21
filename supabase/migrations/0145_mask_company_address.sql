-- Beveiligingsfixlijst Blok 2, M8: get_public_company (0076) maskeert
-- address/postal_code al voor de anonieme embed-bedrijvengids op basis van
-- show_address, maar de ingelogde kant leest companies rechtstreeks uit de
-- tabel (companies_members_select staat élk actief lid toe, zonder
-- kolombeperking) — zowel het bedrijfsprofiel (CompanyProfileContent), de
-- bewerkpagina, als de kaart op de ledenbedrijvengids (bedrijven/page.tsx,
-- die latitude/longitude ophaalt) lieten zo het échte adres/de échte
-- coördinaten zien aan elk lid, ook als het bedrijf show_address bewust op
-- uit had staan.
--
-- Kolom-grant intrekken voor address/postal_code/latitude/longitude en
-- vervangen door een view die dezelfde maskering toepast als
-- get_public_company, plus twee ontgrendelingen die voor de anonieme kant
-- niet relevant zijn: bestuur/beheer (die moet altijd kunnen zien wat er
-- staat) en de leden van het bedrijf zelf (hun eigen, mogelijk bewust
-- verborgen adres). Een view i.p.v. nog een RPC, want alle bestaande
-- call-sites doen al een gewone .from("companies").select(...) — scheelt
-- die allemaal omzetten naar .rpc(...).
revoke select on public.companies from authenticated;

grant select (
  id, name, slug, logo_url, logo_thumb_url, description, tagline, industry,
  website, city, show_address, phone, email, linkedin_url, instagram_url,
  facebook_url, is_publicly_visible, created_by, created_at, updated_at
) on public.companies to authenticated;

create or replace view public.companies_for_members as
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
-- Views lopen standaard met de rechten van de eigenaar, niet van de
-- aanroeper (vandaar dat deze view de ingetrokken kolommen uit companies
-- zelf nog wél kan lezen) — die bypass geldt ook voor RLS, dus de
-- rij-zichtbaarheid die companies_members_select normaal afdwingt wordt
-- hier expliciet herhaald, anders zou ook een niet-actief lid via deze
-- view weer alles kunnen lezen.
where public.is_active_member();

grant select on public.companies_for_members to authenticated;

-- bedrijven/page.tsx (de ledenbedrijvengids-kaart) deelt zijn resultaat
-- bewust 60s tussen alle viewers (cachedQuery("bedrijven-page-data") —
-- "Zichtbaarheid is voor elk actief lid identiek"), dus mag NIET uit
-- companies_for_members komen: die maskeert per kijker (bestuur/eigen
-- bedrijf zien meer), en zou zijn resultaat dan oneigenlijk met andere
-- viewers binnen hetzelfde cache-venster delen. Een aparte, bewust
-- viewer-onafhankelijke functie — zelfde maskering als get_public_companies
-- (alleen show_address, geen bestuur-/lid-ontgrendeling), maar dan voor de
-- interne ledenlijst (alle bedrijven, niet alleen is_publicly_visible) en
-- met de extra kolommen die deze pagina nodig heeft.
create or replace function public.get_companies_directory()
returns table (
  id uuid, name text, industry text, city text, logo_url text,
  logo_thumb_url text, tagline text, latitude double precision,
  longitude double precision, show_address boolean
)
language sql
stable
security definer
set search_path = public
as $$
  select
    id, name, industry, city, logo_url, logo_thumb_url, tagline,
    case when show_address then latitude else null end,
    case when show_address then longitude else null end,
    show_address
  from public.companies
  where public.is_active_member()
  order by name;
$$;

grant execute on function public.get_companies_directory() to authenticated;
