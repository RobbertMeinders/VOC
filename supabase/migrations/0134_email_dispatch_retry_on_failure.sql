-- Portaal-gezondheidsonderzoek, Blok A4 — en een noodzakelijke correctie op
-- A3 (0133) voor e-mail specifiek: dispatch-email.ts boekte een notificatie
-- altijd als "emailed" (mark_notifications_emailed), ook als sendMail() een
-- SMTP-fout teruggaf — een mislukte mail verdween zo stil, zonder ooit
-- opnieuw geprobeerd te worden.
--
-- 0133 loste de dubbel-verzend-race op door emailed_at al bij het LEZEN te
-- zetten (claim-on-read) — maar dat zet 'm per definitie vóórdat we weten of
-- de verzending straks lukt, en maakt "niet markeren bij een fout, retry
-- mogelijk" (A4) onmogelijk voor e-mail. Dit vervangt daarom, uitsluitend
-- voor get_pending_email_notifications, de directe emailed_at-claim door een
-- kortstondige LEASE (email_claimed_at, 10 minuten) los van emailed_at zelf:
--   - claimen zet alleen email_claimed_at (de rij blijft emailed_at = null
--     tot een ECHTE geslaagde verzending dat zet via mark_notifications_
--     emailed, zie dispatch-email.ts).
--   - een tweede, gelijktijdige aanroep binnen die 10 minuten slaat een
--     al-geclaimde rij over (voorkomt dezelfde dubbel-verzend-race als 0133).
--   - mislukt de verzending toch, dan blijft emailed_at null en verloopt de
--     lease na 10 minuten vanzelf — een latere aanroep (de dagelijkse cron
--     als vangnet) pakt 'm dan opnieuw op.
-- get_pending_push_notifications (push, geen retry-eis in dit blok) blijft
-- ongewijzigd zoals in 0133.
alter table public.notifications add column if not exists email_claimed_at timestamptz;

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
      and (n.email_claimed_at is null or n.email_claimed_at < now() - interval '10 minutes')
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
  select l.id, l.type, l.title, l.body, l.link, p.email
  from leased l
  join public.profiles p on p.id = l.profile_id;
end;
$$;
