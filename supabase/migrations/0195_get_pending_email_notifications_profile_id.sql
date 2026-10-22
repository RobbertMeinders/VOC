-- B2/B3-vervolg: de losse notificatiemail-footer (notificationPreferences
-- Footer, src/lib/email/send.ts) wees nog naar /instellingen (inloggen
-- nodig) i.p.v. de nieuwe tokenlink /voorkeuren (zie 0194 en
-- src/app/voorkeuren/route.ts), omdat get_pending_email_notifications geen
-- profile_id teruggaf om die link mee op te bouwen. dispatch-email.ts kreeg
-- alleen notification_id/type/title/body/link/email -- hier dus profile_id
-- toegevoegd aan de kolomlijst (geen inhoudelijke wijziging aan de
-- selectie/claim-logica zelf, exact dezelfde body als 0174, alleen de extra
-- kolom in de laatste SELECT en de RETURNS TABLE).
--
-- Drop + create (niet "create or replace"): de kolomlijst van de
-- RETURNS TABLE wijzigt, zelfde reden/patroon als get_member_profile in
-- 0174 zelf.
drop function if exists public.get_pending_email_notifications(integer);

create function public.get_pending_email_notifications(p_limit integer default 50)
returns table (
  notification_id uuid,
  type text,
  title text,
  body text,
  link text,
  email text,
  profile_id uuid
)
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.notifications n
  set emailed_at = now()
  from public.profiles p
  where n.profile_id = p.id
    and n.emailed_at is null
    and n.communication_id is null
    and (
      not n.channel_email_allowed
      or n.type = 'new_member'
      or (n.type = 'new_activity' and not p.email_new_activity)
      or (n.type = 'activity_reminder' and not p.email_activity_reminder)
      or (n.type = 'feed_comment' and not p.email_feed_comment)
      or (n.type = 'feed_mention' and not p.email_feed_mention)
    );

  return query
  with claimed as (
    select n.id
    from public.notifications n
    join public.profiles p on p.id = n.profile_id
    where n.emailed_at is null
      and n.communication_id is null
      and (n.email_claimed_at is null or n.email_claimed_at < now() - interval '10 minutes')
      and not (
        (n.type = 'new_activity' and p.email_digest_new_activity)
        or (n.type = 'feed_comment' and p.email_digest_feed_comment)
        or (n.type = 'feed_mention' and p.email_digest_feed_mention)
      )
    order by n.created_at
    limit p_limit
    for update of n skip locked
  ),
  leased as (
    update public.notifications n
    set email_claimed_at = now()
    from claimed c
    where n.id = c.id
    returning n.id, n.type, n.title, n.body, n.link, n.profile_id
  )
  select l.id, l.type, l.title, l.body, l.link, p.email, l.profile_id
  from leased l
  join public.profiles p on p.id = l.profile_id;
end;
$$;

revoke execute on function public.get_pending_email_notifications(integer) from public, anon, authenticated;
grant execute on function public.get_pending_email_notifications(integer) to service_role;

insert into public.schema_migration_log (version) values ('0195') on conflict (version) do nothing;
notify pgrst, 'reload schema';
