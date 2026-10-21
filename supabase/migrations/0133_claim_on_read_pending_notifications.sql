-- Portaal-gezondheidsonderzoek, Blok A3: get_pending_push_notifications/
-- get_pending_email_notifications (0079) markeerden de daadwerkelijk te
-- versturen rijen pas NA de verzendlus (mark_notifications_pushed/_emailed,
-- zie dispatch-push.ts/dispatch-email.ts) — niet bij het lezen zelf. Twee
-- gelijktijdige aanroepen (de directe dispatch vlak na een actie via
-- next/server's after(), en de dagelijkse cron als vangnet) konden zo
-- dezelfde, nog niet gemarkeerde rijen allebei opgehaald krijgen en dus
-- dezelfde melding dubbel pushen/mailen.
--
-- Fix: de "sowieso overslaan" rijen (voorkeur/type-uitzonderingen) blijven
-- zoals in 0079 vooraf gemarkeerd, maar de rijen die ECHT verstuurd gaan
-- worden, worden nu in dezelfde transactie geclaimd (FOR UPDATE SKIP LOCKED
-- + meteen pushed_at/emailed_at zetten) vóórdat ze teruggegeven worden. Een
-- tweede, gelijktijdige aanroep slaat een al-geclaimde rij dus over i.p.v.
-- 'm ook op te pikken. De latere mark_notifications_pushed/_emailed-aanroep
-- in dispatch-push.ts/dispatch-email.ts blijft onschadelijk (idempotent —
-- zet een al gezette pushed_at/emailed_at gewoon opnieuw).
--
-- Bijkomend verschil met 0079: p_limit begrensde voorheen het aantal
-- notificatie×device-rijen (na de join met push_subscriptions); nu begrenst
-- het het aantal GECLAIMDE notificaties, en wordt pas daarna uitgewaaierd
-- over de devices van elk profiel — consistenter met de bedoeling van de
-- parameter (batchgrootte van te verwerken meldingen, niet van rijen).
create or replace function public.get_pending_push_notifications(p_limit integer default 50)
returns table (
  notification_id uuid,
  type text,
  title text,
  body text,
  link text,
  endpoint text,
  p256dh text,
  auth text
)
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.notifications n
  set pushed_at = now()
  from public.profiles p
  where n.profile_id = p.id
    and n.pushed_at is null
    and n.communication_id is null
    and (
      not n.channel_push_allowed
      or n.type = 'new_member'
      or (n.type in ('new_activity', 'activity_reminder') and not p.push_activities)
      or (n.type in ('feed_comment', 'feed_mention') and not p.push_feed)
    );

  return query
  with claimed as (
    select n.id, n.type, n.title, n.body, n.link, n.profile_id
    from public.notifications n
    where n.pushed_at is null
      and n.communication_id is null
      and exists (select 1 from public.push_subscriptions s where s.profile_id = n.profile_id)
    order by n.created_at
    limit p_limit
    for update of n skip locked
  ),
  marked as (
    update public.notifications n
    set pushed_at = now()
    from claimed c
    where n.id = c.id
    returning n.id, n.type, n.title, n.body, n.link, n.profile_id
  )
  select m.id, m.type, m.title, m.body, m.link, s.endpoint, s.p256dh, s.auth
  from marked m
  join public.push_subscriptions s on s.profile_id = m.profile_id;
end;
$$;

create or replace function public.get_pending_email_notifications(p_limit integer default 50)
returns table (
  notification_id uuid,
  type text,
  title text,
  body text,
  link text,
  email text
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
      or (n.type in ('new_activity', 'activity_reminder') and not p.email_activities)
      or (n.type in ('feed_comment', 'feed_mention') and not p.email_feed)
    );

  return query
  with claimed as (
    select n.id
    from public.notifications n
    where n.emailed_at is null
      and n.communication_id is null
    order by n.created_at
    limit p_limit
    for update of n skip locked
  ),
  marked as (
    update public.notifications n
    set emailed_at = now()
    from claimed c
    where n.id = c.id
    returning n.id, n.type, n.title, n.body, n.link, n.profile_id
  )
  select m.id, m.type, m.title, m.body, m.link, p.email
  from marked m
  join public.profiles p on p.id = m.profile_id;
end;
$$;
