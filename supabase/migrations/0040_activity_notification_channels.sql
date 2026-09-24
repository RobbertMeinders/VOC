-- Fase C: bestuur kiest per activiteit of de "nieuwe activiteit"-notificatie
-- als push, e-mail, beide of geen van beide verstuurd wordt — bovenop (niet
-- in plaats van) de persoonlijke voorkeur van elk lid. Geldt op het moment
-- dat een activiteit zichtbaar wordt: direct aanmaken (bestuur) of een
-- community-inzending goedkeuren — allebei via dezelfde
-- notify_activity_published-trigger (0019_broadcast_notifications.sql).

alter table public.activities
  add column notify_push boolean not null default true,
  add column notify_email boolean not null default true;

alter table public.notifications
  add column channel_push_allowed boolean not null default true,
  add column channel_email_allowed boolean not null default true;

create or replace function public.notify_activity_published()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status = 'approved' and (tg_op = 'INSERT' or old.status is distinct from 'approved') then
    insert into public.notifications (profile_id, type, title, body, link, channel_push_allowed, channel_email_allowed)
    select id, 'new_activity', 'Nieuwe activiteit: ' || new.title,
      'Op ' || to_char(new.starts_at at time zone 'Europe/Amsterdam', 'DD-MM-YYYY "om" HH24:MI') ||
        coalesce(' bij ' || new.location, '') || '.',
      '/agenda/' || new.id,
      new.notify_push, new.notify_email
    from public.profiles
    where is_active and (new.created_by is null or id <> new.created_by);
  end if;
  return new;
end;
$$;

-- Extra voorwaarde toegevoegd (channel_push_allowed) naast de bestaande
-- persoonlijke-voorkeur-checks — beide moeten true zijn. Return-kolommen
-- blijven ongewijzigd, dus create or replace volstaat hier (in
-- tegenstelling tot 0039, waar het aantal kolommen wél wijzigde).
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
    and (
      not n.channel_push_allowed
      or (n.type in ('new_activity', 'activity_reminder', 'waitlist_promoted') and not p.push_activities)
      or (n.type in ('feed_comment', 'feed_mention') and not p.push_feed)
      or (n.type = 'new_member' and not p.push_new_members)
    );

  return query
  select n.id, n.type, n.title, n.body, n.link, s.endpoint, s.p256dh, s.auth
  from public.notifications n
  join public.push_subscriptions s on s.profile_id = n.profile_id
  where n.pushed_at is null
  order by n.created_at
  limit p_limit;
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
    and (
      not n.channel_email_allowed
      or (n.type in ('new_activity', 'activity_reminder', 'waitlist_promoted') and not p.email_activities)
      or (n.type in ('feed_comment', 'feed_mention') and not p.email_feed)
      or (n.type = 'new_member' and not p.email_new_members)
    );

  return query
  select n.id, n.type, n.title, n.body, n.link, p.email
  from public.notifications n
  join public.profiles p on p.id = n.profile_id
  where n.emailed_at is null
  order by n.created_at
  limit p_limit;
end;
$$;
