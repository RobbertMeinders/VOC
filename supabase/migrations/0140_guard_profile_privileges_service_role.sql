-- Beveiligingsfixlijst Blok 1, H2: guard_profile_privileges() (0139) kreeg
-- bij deactivated_at een service-role-uitzondering omdat anonymize_profile_now
-- (service-role, 0136) dezelfde update doet, maar is_active's eigen
-- voorwaarde (al sinds 0093) bleef zonder die uitzondering staan. Een
-- SECURITY DEFINER-functie onderdrukt trigger-uitvoering niet: de trigger
-- vuurt nog steeds, met auth.role() = 'service_role' maar auth.uid() = null,
-- dus is_board()/de self-voorwaarde slaan allebei niet aan en is_active
-- werd stilzwijgend teruggezet naar de oude waarde. Daardoor bleef een
-- geanonimiseerd profiel onbedoeld actief (en dus zichtbaar in de ledenlijst)
-- totdat iemand het los, via de board-route, alsnog deactiveerde.
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
      or auth.role() = 'service_role'
      or (new.id = auth.uid() and old.is_active and not new.is_active)
    ) then
      new.is_active := old.is_active;
    end if;
    if not (
      public.is_board()
      or auth.role() = 'service_role'
      or (new.id = auth.uid() and old.is_active and not new.is_active)
    ) then
      new.deactivated_at := old.deactivated_at;
    end if;
    if not public.is_board() then
      new.is_organization_account := old.is_organization_account;
    end if;
  end if;
  return new;
end;
$$;
