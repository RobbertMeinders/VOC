-- create_activity_reminders (laatst herdefinieerd in 0157) had drie
-- problemen:
-- 1. Geen filter op a.status: een geannuleerde activiteit kreeg gewoon een
--    "herinnering" gestuurd.
-- 2. Geen filter op r.is_waitlisted: wie op de wachtlijst staat (dus niet
--    daadwerkelijk een plek heeft) kreeg ook een "je gaat hierheen"-
--    herinnering.
-- 3. Geen filter op profiel is_active (vergelijkbaar patroon als 0103 voor
--    andere notify-functies) — een gedeactiveerd lid kreeg nog herinneringen.
-- 4. Dedup op de activiteits-SLUG i.p.v. activity_id: de slug verandert bij
--    een titel-/datumwijziging (URL-ronde, 0049/0155), dus een gewijzigde
--    activiteit kon alsnog een dubbele herinnering krijgen omdat de oude
--    notificatie een ander link-pad had. notifications heeft geen directe
--    activity_id-kolom, dus dedup nu tegen zowel de huidige slug als elke
--    historische alias van deze activiteit (activity_slug_aliases, 0155) —
--    zo matcht een eerder verstuurde herinnering met een oude slug nog
--    steeds dezelfde activiteit.
create or replace function public.create_activity_reminders()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count integer;
  v_cfg record;
begin
  select * into v_cfg from public.notification_dispatch_config('activity_reminder');
  if not v_cfg.enabled then
    return 0;
  end if;

  insert into public.notifications (profile_id, type, title, body, link, channel_push_allowed, channel_email_allowed, channel_inapp_allowed)
  select
    r.profile_id,
    'activity_reminder',
    'Herinnering: ' || a.title,
    'Deze activiteit vindt plaats op ' ||
      to_char(a.starts_at at time zone 'Europe/Amsterdam', 'DD-MM-YYYY "om" HH24:MI') ||
      coalesce(' bij ' || a.location, '') || '.',
    '/agenda/' || a.slug,
    v_cfg.channel_push, v_cfg.channel_email, v_cfg.channel_inapp
  from public.activity_registrations r
  join public.activities a on a.id = r.activity_id
  join public.profiles p on p.id = r.profile_id
  where a.starts_at > now()
    and a.starts_at <= now() + interval '2 days'
    and a.status <> 'cancelled'
    and not r.is_waitlisted
    and p.is_active
    and not exists (
      select 1 from public.notifications n
      where n.profile_id = r.profile_id
        and n.type = 'activity_reminder'
        and (
          n.link = '/agenda/' || a.slug
          or n.link in (
            select '/agenda/' || alias.slug
            from public.activity_slug_aliases alias
            where alias.activity_id = a.id
          )
        )
    );

  get diagnostics v_count = row_count;
  return v_count;
end;
$$;
