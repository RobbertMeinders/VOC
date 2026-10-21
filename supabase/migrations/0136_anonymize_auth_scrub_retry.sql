-- Portaal-gezondheidsonderzoek, Blok A6 (AVG): anonymize_expired_profiles()/
-- anonymize_profile_now() wisten de persoonsgegevens in public.profiles
-- (inclusief de "verwijderd-..."-placeholder-e-mail op die rij) atomair,
-- maar het ECHTE adres in auth.users en het oude avatar-Storage-bestand
-- werden daarna, BUITEN die transactie, apart bijgewerkt door de aanroeper
-- (anonymize-members-cron resp. deleteMemberAction) via de Supabase Admin
-- API. Zodra anonymized_at eenmaal gezet is, komt die rij nooit meer in de
-- "nog te verwerken"-selectie van anonymize_expired_profiles() terecht — een
-- mislukte/overgeslagen Admin API-aanroep (netwerkhik, tijdelijke
-- storing, ...) liet het echte e-mailadres zo voorgoed in auth.users staan,
-- zonder enige herkansing.
--
-- Fix: twee nieuwe kolommen die bijhouden wat er nog ECHT buiten de database
-- afgehandeld moet worden, los van anonymized_at zelf:
--   - auth_scrubbed_at: null totdat het auth.users-e-mailadres succesvol is
--     overschreven.
--   - pending_avatar_cleanup: het oude avatar-pad, totdat het Storage-
--     bestand succesvol verwijderd is (avatar_url zelf wordt, zoals al
--     sinds 0063, meteen leeggemaakt op de profiles-rij).
-- get_profiles_pending_auth_scrub() geeft bij ELKE cron-run opnieuw alle nog
-- openstaande rijen terug — niet alleen de net-verlopen batch van dit
-- moment — dus een eerder mislukte poging (uit welke bron ook:
-- anonymize_expired_profiles() via de cron, of een rechtstreekse
-- anonymize_profile_now() via Beheer -> Leden) wordt vanzelf bij de
-- volgende run opnieuw geprobeerd.
alter table public.profiles
  add column if not exists auth_scrubbed_at timestamptz,
  add column if not exists pending_avatar_cleanup text;

create or replace function public.anonymize_expired_profiles()
returns table (profile_id uuid, old_avatar_url text)
language plpgsql
security definer
set search_path = public
as $$
begin
  return query
  with expired as (
    select id, avatar_url
    from public.profiles
    where is_active = false
      and deactivated_at is not null
      and deactivated_at <= now() - interval '90 days'
      and anonymized_at is null
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
      anonymized_at = now(),
      pending_avatar_cleanup = expired.avatar_url
    from expired
    where p.id = expired.id
    returning p.id
  )
  select expired.id, expired.avatar_url from expired;
end;
$$;

create or replace function public.anonymize_profile_now(p_id uuid)
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
      anonymized_at = now(),
      pending_avatar_cleanup = target.avatar_url
    from target
    where p.id = target.id
    returning p.id
  )
  select target.id, target.avatar_url from target;
end;
$$;

-- Alle anonymized_at-rijen die nog een echte auth.users-e-mailwijziging
-- en/of een avatar-Storage-opruiming nodig hebben — onafhankelijk van
-- wanneer/via welke functie ze geanonimiseerd werden.
create function public.get_profiles_pending_auth_scrub()
returns table (profile_id uuid, pending_avatar_cleanup text)
language sql
stable
security definer
set search_path = public
as $$
  select id, pending_avatar_cleanup
  from public.profiles
  where anonymized_at is not null
    and (auth_scrubbed_at is null or pending_avatar_cleanup is not null);
$$;

create function public.mark_profiles_auth_scrubbed(p_ids uuid[])
returns void
language sql
security definer
set search_path = public
as $$
  update public.profiles set auth_scrubbed_at = now() where id = any(p_ids) and auth_scrubbed_at is null;
$$;

create function public.mark_profiles_avatar_cleaned(p_ids uuid[])
returns void
language sql
security definer
set search_path = public
as $$
  update public.profiles set pending_avatar_cleanup = null where id = any(p_ids);
$$;

revoke execute on function public.get_profiles_pending_auth_scrub()   from public, anon, authenticated;
revoke execute on function public.mark_profiles_auth_scrubbed(uuid[]) from public, anon, authenticated;
revoke execute on function public.mark_profiles_avatar_cleaned(uuid[]) from public, anon, authenticated;

grant execute on function public.get_profiles_pending_auth_scrub()   to service_role;
grant execute on function public.mark_profiles_auth_scrubbed(uuid[]) to service_role;
grant execute on function public.mark_profiles_avatar_cleaned(uuid[]) to service_role;
