-- Sommige ondernemers vullen als bezoekersadres hun privéadres in (geen
-- eigen bedrijfspand) — dit laat ze het adres verbergen op de bedrijfspagina
-- én op de kaart, zonder de rest van hun bedrijfsprofiel te hoeven
-- verbergen. Standaard zichtbaar (bestaand gedrag), zoals show_email/
-- show_phone (0006_profile_privacy.sql) en show_attended_activities
-- (0035_attended_activities_visibility.sql).
alter table public.companies
  add column show_address boolean not null default true;

-- companies_board_update (0001_init.sql) beperkt UPDATE op companies tot
-- bestuur/beheer — logisch voor de volledige bedrijfsgegevens, maar dit
-- schuifje moet ook los vanaf de instellingenpagina te zetten zijn door een
-- gewoon lid van dát bedrijf (die weet nu eenmaal het beste of het adres
-- een privéadres is). I.p.v. de RLS-policy te verruimen (dan kan elk lid
-- ineens alle bedrijfsvelden wijzigen) een smalle, specifieke
-- security-definer-functie die alleen deze ene kolom raakt en zijn eigen
-- autorisatiecheck doet.
create or replace function public.set_company_show_address(p_company_id uuid, p_visible boolean)
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

  update public.companies set show_address = p_visible where id = p_company_id;
end;
$$;

grant execute on function public.set_company_show_address(uuid, boolean) to authenticated;
