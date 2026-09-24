-- Twee samenhangende privacy-features:
--
-- 1) Granulaire pushvoorkeuren — los van de bestaande globale aan/uit
--    (device-niveau: is dit device sowieso geabonneerd, zie push_subscriptions).
--    Dit is profielniveau: welke soort meldingen wil je er ooit als push
--    bij. Bestuur/beheer-moderatiemeldingen (nieuwe aanvraag ter
--    goedkeuring, gerapporteerd bericht, ...) en de uitkomst van je eigen
--    aanvraag/inzending vallen hier bewust buiten — dat is operationeel/
--    belangrijk, geen ruis om uit te kunnen zetten.
--
-- 2) Bewaartermijn na deactivering: 90 dagen na het moment dat een lid
--    gedeactiveerd wordt (bestuur/beheer, zie leden/[id]/actions.ts),
--    worden persoonsgegevens automatisch geanonimiseerd — geplaatste
--    berichten/reacties/likes blijven gewoon staan (nu onder "Verwijderd
--    lid"), zodat lopende feed-gesprekken niet kapot gaan.

alter table public.profiles
  add column deactivated_at timestamptz,
  add column anonymized_at timestamptz,
  add column push_activities boolean not null default true,
  add column push_feed boolean not null default true,
  add column push_new_members boolean not null default true;

-- get_pending_push_notifications (0011_notifications_push.sql) filtert nu
-- ook op deze voorkeuren: een notificatie van een uitgezette categorie
-- wordt meteen als afgehandeld gemarkeerd (nooit gepusht) i.p.v. steeds
-- opnieuw meegenomen te worden — hij blijft wel gewoon in het in-app
-- notificatiecentrum staan, dat leest rechtstreeks uit notifications,
-- ongeacht pushed_at.
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
      (n.type in ('new_activity', 'activity_reminder', 'waitlist_promoted') and not p.push_activities)
      or (n.type in ('feed_comment', 'feed_mention') and not p.push_feed)
      or (n.type = 'new_member' and not p.push_new_members)
    );

  return query
  select n.id, n.title, n.body, n.link, s.endpoint, s.p256dh, s.auth
  from public.notifications n
  join public.push_subscriptions s on s.profile_id = n.profile_id
  where n.pushed_at is null
  order by n.created_at
  limit p_limit;
end;
$$;

-- Aangeroepen door /api/cron/anonymize-members. Naam is not null, dus
-- "Verwijderd lid" i.p.v. leeg; e-mail is ook not null, dus een niet-
-- herleidbare placeholder i.p.v. null (moet ook uniek zijn per lid, vandaar
-- de eigen id erin). Retourneert de aangepaste profiel-id's, zodat de
-- aanroepende route ook het bijbehorende auth.users-e-mailadres kan
-- overschrijven via de Supabase Admin API — deze functie zelf raakt alleen
-- public.profiles (nooit auth.* rechtstreeks vanuit SQL).
create or replace function public.anonymize_expired_profiles()
returns table (profile_id uuid)
language plpgsql
security definer
set search_path = public
as $$
begin
  return query
  update public.profiles
  set
    first_name = 'Verwijderd',
    last_name = 'lid',
    email = 'verwijderd-' || id || '@voc-ledenportaal.invalid',
    phone = null,
    job_title = null,
    bio = null,
    avatar_url = null,
    linkedin_url = null,
    anonymized_at = now()
  where is_active = false
    and deactivated_at is not null
    and deactivated_at <= now() - interval '90 days'
    and anonymized_at is null
  returning id;
end;
$$;

grant execute on function public.anonymize_expired_profiles() to anon, authenticated;
