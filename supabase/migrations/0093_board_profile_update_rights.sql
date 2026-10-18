-- K4: de UI (MemberProfileContent.tsx, "Beheer"-blok) en de server actions
-- in leden/[id]/actions.ts (updateMemberActiveAction, updateMemberProfile
-- Action, updateMemberOrganizationAccountAction, quickUpdateMemberAction)
-- staan alle vier een gewoon bestuurslid toe om andermans profiel te
-- bewerken (requireBoard()). Maar op public.profiles bestond alleen
-- profiles_self_update (eigen rij) en profiles_admin_update (beheerder) —
-- geen policy liet een bestuurslid een rij van iemand anders bereiken. Een
-- update raakte dus stil 0 rijen (geen Postgres-fout), en de meeste van die
-- actions controleren het aantal geraakte rijen niet, dus de UI toonde
-- succes en er kwam zelfs een auditlog-regel bij, terwijl er niets
-- veranderde.
create policy "profiles_board_update" on public.profiles
  for update using (public.is_board());

-- Kolombeveiliging blijft bij guard_profile_privileges (0001_init.sql,
-- 0092): role blijft altijd uitsluitend voor een beheerder. is_active mag nu
-- ook door een bestuurslid gewijzigd worden, op ieders rij en beide kanten
-- op (MemberActiveToggle laat zowel activeren als deactiveren toe) — naast
-- de bestaande uitzondering uit 0092 dat een lid zichzelf mag deactiveren.
create or replace function public.guard_profile_privileges()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    new.role := old.role;
    if not (
      public.is_board()
      or (new.id = auth.uid() and old.is_active and not new.is_active)
    ) then
      new.is_active := old.is_active;
    end if;
  end if;
  return new;
end;
$$;
