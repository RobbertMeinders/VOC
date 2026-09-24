-- E-mail als tweede notificatiekanaal naast push — zelfde architectuur als
-- de pushvoorkeuren (0037_retention_and_push_preferences.sql): drie
-- per-categorie schakelaars op profiles, en een pending-RPC die de cron
-- job voedt. Buiten deze drie categorieën gaat alles altijd door (zelfde
-- uitzondering als bij push: moderatie-meldingen voor bestuur/beheer, en
-- de uitkomst van je eigen aanvraag/inzending).

alter table public.profiles
  add column email_activities boolean not null default true,
  add column email_feed boolean not null default true,
  add column email_new_members boolean not null default true;

-- Mirror van pushed_at, zodat dezelfde notificatie-rij onafhankelijk per
-- kanaal kan worden afgehandeld (een lid kan bv. wel push maar geen mail
-- willen, of andersom).
alter table public.notifications
  add column emailed_at timestamptz;

-- Mirror van get_pending_push_notifications: markeert notificaties van een
-- uitgezette categorie meteen als afgehandeld (nooit gemaild) i.p.v. ze
-- steeds opnieuw mee te nemen, en geeft de rest terug samen met het
-- e-mailadres van de ontvanger. In tegenstelling tot een pushabonnement
-- heeft elk lid altijd een e-mailadres, dus hier is geen aparte join met
-- een opt-in-tabel nodig zoals push_subscriptions.
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
      (n.type in ('new_activity', 'activity_reminder', 'waitlist_promoted') and not p.email_activities)
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

-- Mirror van mark_notifications_pushed.
create or replace function public.mark_notifications_emailed(p_ids uuid[])
returns void
language sql
security definer
set search_path = public
as $$
  update public.notifications set emailed_at = now() where id = any(p_ids);
$$;

grant execute on function public.get_pending_email_notifications(integer) to anon, authenticated;
grant execute on function public.mark_notifications_emailed(uuid[]) to anon, authenticated;
