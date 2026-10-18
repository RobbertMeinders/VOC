-- 0062_lock_down_profiles_contact_columns.sql revoked column-level SELECT
-- on email/phone, maar liet de standaard tabel-brede SELECT-grant op
-- public.profiles (niet door een migratie in deze repo gezet — hoort bij
-- de standaard projectinstellingen) ongemoeid. PostgreSQL-rechtencontrole
-- is optelbaar: een bredere tabel-grant staat kolomtoegang nog steeds toe,
-- ongeacht een smallere kolom-revoke ernaast. Bevestigd: een rechtstreekse
-- REST-select van email/phone op elke ledenrij gaf gewoon de echte waarden
-- terug, voor elke ingelogde sessie, ongeacht show_email/show_phone.
--
-- Fix: de tabel-brede SELECT-grant intrekken en opnieuw geven, nu met een
-- expliciete kolomlijst zonder email/phone. Die twee kolommen blijven
-- alleen bereikbaar via get_member_profile/get_members_directory (0061),
-- die de show_email/show_phone-maskering al correct toepassen.
revoke select on public.profiles from authenticated, anon;

grant select (
  id, first_name, last_name, job_title, avatar_url, avatar_thumb_url, role,
  is_active, show_email, show_phone, show_attended_activities,
  push_activities, push_feed, push_new_members, email_activities,
  email_feed, email_new_members, email_campaigns, deactivated_at,
  anonymized_at, last_active_at, linkedin_url, instagram_url, facebook_url,
  bio, is_organization_account, publicly_visible, onboarding_dismissed_at,
  created_at, updated_at
) on public.profiles to authenticated, anon;

-- Board-only export van de deelnemerslijst van een activiteit, inclusief
-- e-mailadres — vervangt de rechtstreekse embedded select
-- (activity_registrations.select('...profile:profiles(..., email)')) in
-- agenda/[id]/registraties.csv, die na de grant hierboven niet meer werkt.
-- Zelfde patroon als get_member_profile: een security-definer-functie die
-- de rechtencheck expliciet zelf herhaalt, i.p.v. op kolomrechten te
-- vertrouwen.
create function public.get_activity_registration_export(p_activity_id uuid)
returns table (
  first_name text,
  last_name text,
  email text,
  is_waitlisted boolean,
  attended boolean
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not public.is_board() then
    raise exception 'not authorized';
  end if;

  return query
  select p.first_name, p.last_name, p.email, r.is_waitlisted, r.attended
  from public.activity_registrations r
  join public.profiles p on p.id = r.profile_id
  where r.activity_id = p_activity_id
  order by r.created_at;
end;
$$;

grant execute on function public.get_activity_registration_export(uuid) to authenticated;
