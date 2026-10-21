-- Meldingensysteem fase 1: new_activity ging altijd naar "alle actieve
-- leden", hardcoded in notify_activity_published i.p.v. via
-- notification_type_settings.roles (zoals new_member/activity_submission/
-- company_membership_request/feed_post_report/access_request al deden).
-- Nu ook rolconfigureerbaar vanuit het notificatieregels-scherm, met
-- array['lid','bestuurslid','beheerder'] als standaardwaarde zodra er nog
-- geen expliciete keuze is gemaakt — reproduceert exact het huidige gedrag
-- voor wie deze instelling niet aanpast.
update public.notification_type_settings
set roles = array['lid', 'bestuurslid', 'beheerder']
where type = 'new_activity' and roles is null;

create or replace function public.notify_activity_published()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_cfg record;
begin
  if new.status = 'approved' and (tg_op = 'INSERT' or old.status is distinct from 'approved') then
    select * into v_cfg from public.notification_dispatch_config('new_activity');
    if not v_cfg.enabled then
      return new;
    end if;

    insert into public.notifications (profile_id, type, title, body, link, channel_push_allowed, channel_email_allowed, channel_inapp_allowed)
    select id, 'new_activity', 'Nieuwe activiteit: ' || new.title,
      'Op ' || to_char(new.starts_at at time zone 'Europe/Amsterdam', 'DD-MM-YYYY "om" HH24:MI') ||
        coalesce(' bij ' || new.location, '') || '.',
      '/agenda/' || new.slug,
      new.notify_push and v_cfg.channel_push,
      new.notify_email and v_cfg.channel_email,
      v_cfg.channel_inapp
    from public.profiles
    where is_active
      and role = any(coalesce(v_cfg.roles, array['lid', 'bestuurslid', 'beheerder']))
      and (new.created_by is null or id <> new.created_by);
  end if;
  return new;
end;
$$;
