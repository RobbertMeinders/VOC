-- Live-QA-opmerking op de beveiligingsfix (0126/0128): companies_member_update
-- (0083) geeft elk gekoppeld lid volledige kolom-bewerkrechten op het eigen
-- bedrijf — zonder deze guard zou een lid dus ook created_by kunnen
-- herschrijven. Niet voor een bedrijf waar iemand al lid van is exploiteerbaar
-- (de "nog ledenloos"-uitzondering in company_members_self_new_company_insert
-- geldt toch al niet meer zodra er een lid is), en companies_member_update
-- laat sowieso alleen een bestaand lid de rij van zijn éigen bedrijf
-- aanraken — maar created_by hoort, net als slug (0096), gewoon niet via de
-- gewone "bedrijf bewerken"-rechten wijzigbaar te zijn.
create or replace function public.guard_company_privileges()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_board() then
    new.slug := old.slug;
    new.created_by := old.created_by;
  end if;
  return new;
end;
$$;
