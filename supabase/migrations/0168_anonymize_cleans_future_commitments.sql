-- Diepte-audit Blok B1: anonymize_expired_profiles()/anonymize_profile_now()
-- (laatst herdefinieerd in 0136) ruimden alleen de profiles-rij zelf en
-- (via deleteMemberAction) company_members op. Drie andere plekken bleven
-- een "spookplek" van het geanonimiseerde lid bezetten:
--   - activity_registrations voor een activiteit die nog moet plaatsvinden
--     (telt nog mee in capaciteit/wachtlijst voor iemand die niet meer
--     actief is) — aanmeldingen voor een activiteit die al heeft
--     plaatsgevonden blijven bewust staan (opkomstgeschiedenis/statistiek).
--   - commission_memberships (geen reden om commissielidmaatschap te
--     behouden voor een geanonimiseerd profiel).
--   - company_membership_requests met status 'pending' op naam van dit
--     profiel (een bestuurslid zou anders een koppelverzoek van een
--     inmiddels geanonimiseerd lid te zien krijgen in de aanvragenlijst).
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
  ),
  cleaned_registrations as (
    delete from public.activity_registrations ar
    using public.activities a, expired
    where ar.profile_id = expired.id
      and ar.activity_id = a.id
      and a.starts_at > now()
  ),
  cleaned_commissions as (
    delete from public.commission_memberships cm
    using expired
    where cm.profile_id = expired.id
  ),
  cleaned_requests as (
    update public.company_membership_requests r
    set status = 'rejected', decided_at = now()
    from expired
    where r.profile_id = expired.id and r.status = 'pending'
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
  ),
  cleaned_registrations as (
    delete from public.activity_registrations ar
    using public.activities a, target
    where ar.profile_id = target.id
      and ar.activity_id = a.id
      and a.starts_at > now()
  ),
  cleaned_commissions as (
    delete from public.commission_memberships cm
    using target
    where cm.profile_id = target.id
  ),
  cleaned_requests as (
    update public.company_membership_requests r
    set status = 'rejected', decided_at = now()
    from target
    where r.profile_id = target.id and r.status = 'pending'
  )
  select target.id, target.avatar_url from target;
end;
$$;
