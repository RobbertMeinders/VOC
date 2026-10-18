-- guard_profile_privileges (0001_init.sql) blokkeert voor een niet-
-- beheerder elke wijziging aan role/is_active, ook op de eigen rij — dat
-- voorkomt terecht dat een lid zichzelf promoveert of zichzelf (opnieuw)
-- activeert. Maar het blokkeerde zo ook deleteMyAccountAction
-- (profiel/actions.ts, "Account verwijderen"): die zet is_active=false op
-- de eigen rij, en de trigger draaide dat stilzwijgend terug naar true —
-- deactivated_at werd wel gezet, is_active nooit, dus het account bleef
-- gewoon bruikbaar en anonymize_expired_profiles (0037, die is_active=false
-- vereist) zou het nooit oppikken.
--
-- Smalle uitzondering: alleen de overgang true -> false, en alleen op de
-- eigen rij. Reactiveren (false -> true) en elke wijziging aan andermans
-- rij blijven, net als role, uitsluitend voor een beheerder.
create or replace function public.guard_profile_privileges()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    new.role := old.role;
    if not (new.id = auth.uid() and old.is_active and not new.is_active) then
      new.is_active := old.is_active;
    end if;
  end if;
  return new;
end;
$$;
