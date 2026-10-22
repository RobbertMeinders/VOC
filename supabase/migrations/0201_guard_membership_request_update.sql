-- Hardening-batch, P0-2. company_membership_requests_decide_update (zie
-- 0172) heeft een using-clausule (bestuur, of een actief lid van hetzelfde
-- bedrijf) maar géén with-check -- een aanroeper die aan de using-
-- voorwaarde voldoet voor zijn EIGEN bedrijf kon dus bij een update ook
-- profile_id naar een willekeurige andere gebruiker verzetten en
-- status/decided_by zelf invullen. handle_company_membership_decision
-- verwerkt zo'n "goedkeuring" vervolgens voor dat (vervalste) profiel-id,
-- inclusief het verwijderen van diens bestaande bedrijfskoppelingen elders
-- (één-bedrijf-per-lid-aanname). Zelfde patroon/stijl als de bestaande
-- BEFORE INSERT-guard (guard_company_membership_request_insert, 0147):
-- profile_id/company_id zijn na het aanmaken van de rij onveranderlijk,
-- en decided_by wordt altijd hard op de echte aanroeper gezet i.p.v. op
-- wat de client meestuurt -- status/decision_reason blijven vrij, dat is
-- precies waar deze update voor bedoeld is.
--
-- auth.uid() is null bij de interne, service-role-aangestuurde opruiming
-- in anonymize_expired_profiles/anonymize_profile_now (0168) -- die zet nu
-- al geen decided_by, dus daar verandert dit niets aan (blijft null).
create or replace function public.guard_company_membership_request_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  new.profile_id := old.profile_id;
  new.company_id := old.company_id;
  new.decided_by := auth.uid();
  return new;
end;
$$;

create trigger company_membership_requests_guard_update
  before update on public.company_membership_requests
  for each row execute function public.guard_company_membership_request_update();

-- Puur een triggerfunctie, nooit rechtstreeks aan te roepen -- zelfde
-- PUBLIC-dichtzetten als de P0-1-sweep hierboven (0200), nu meteen bij
-- aanmaak i.p.v. pas bij de volgende sweep.
revoke execute on function public.guard_company_membership_request_update() from public;

insert into public.schema_migration_log (version) values ('0201') on conflict (version) do nothing;
notify pgrst, 'reload schema';
