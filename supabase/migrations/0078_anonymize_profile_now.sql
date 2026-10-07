-- UX-wens: een beheerder moet een lid direct kunnen "verwijderen" vanuit
-- Beheer -> Leden, i.p.v. te moeten wachten tot anonymize_expired_profiles()
-- (0063_medium_audit_fixes.sql) dat 90 dagen na deactivering automatisch
-- doet. Zelfde eindresultaat (persoonsgegevens gewist, account onbruikbaar,
-- geplaatste berichten/reacties blijven staan onder "Verwijderd lid"), maar
-- nu meteen en op een los gekozen profiel i.p.v. op de hele vervallen-batch.
create function public.anonymize_profile_now(p_id uuid)
returns table (profile_id uuid, old_avatar_url text)
language plpgsql
security definer
set search_path = public
as $$
begin
  return query
  with target as (
    select id, avatar_url
    from public.profiles
    where id = p_id and anonymized_at is null
    for update
  ),
  updated as (
    update public.profiles p
    set
      first_name = 'Verwijderd',
      last_name = 'lid',
      email = 'verwijderd-' || p.id || '@voc-ledenportaal.invalid',
      phone = null,
      job_title = null,
      bio = null,
      avatar_url = null,
      linkedin_url = null,
      is_active = false,
      deactivated_at = coalesce(p.deactivated_at, now()),
      anonymized_at = now()
    from target
    where p.id = target.id
    returning p.id
  )
  select target.id, target.avatar_url from target;
end;
$$;

-- Alleen de server-actie (met admin-client, voor de bijbehorende
-- auth.users-e-mailwijziging) roept dit aan — zelfde rechten-opzet als
-- anonymize_expired_profiles().
grant execute on function public.anonymize_profile_now(uuid) to service_role;
