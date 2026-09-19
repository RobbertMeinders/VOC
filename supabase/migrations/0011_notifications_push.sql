-- Fase 5: notificaties (in-app + web push).

-- Tracks whether a notification has already been dispatched as a web push,
-- so the cron job below never double-sends.
alter table public.notifications
  add column pushed_at timestamptz;

-- Called by /api/cron/send-push (see vercel.json). Security definer so it
-- can read every member's pending notifications and push subscriptions
-- regardless of the (anonymous, cron-triggered) caller — same reasoning as
-- create_activity_reminders() in 0008_agenda.sql.
create or replace function public.get_pending_push_notifications(p_limit integer default 50)
returns table (
  notification_id uuid,
  title text,
  body text,
  link text,
  endpoint text,
  p256dh text,
  auth text
)
language sql
stable
security definer
set search_path = public
as $$
  select n.id, n.title, n.body, n.link, s.endpoint, s.p256dh, s.auth
  from public.notifications n
  join public.push_subscriptions s on s.profile_id = n.profile_id
  where n.pushed_at is null
  order by n.created_at
  limit p_limit;
$$;

create or replace function public.mark_notifications_pushed(p_ids uuid[])
returns void
language sql
security definer
set search_path = public
as $$
  update public.notifications set pushed_at = now() where id = any(p_ids);
$$;

grant execute on function public.get_pending_push_notifications(integer) to anon, authenticated;
grant execute on function public.mark_notifications_pushed(uuid[]) to anon, authenticated;

-- So the notification bell can update live without a page refresh, the same
-- way the feed already does (0005_feed_realtime.sql). RLS still applies:
-- a client only ever receives change events for rows it's allowed to select
-- (profile_id = auth.uid()), so this doesn't leak other members' notifications.
alter publication supabase_realtime add table public.notifications;
