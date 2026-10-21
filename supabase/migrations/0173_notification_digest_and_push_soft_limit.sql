-- Meldingensysteem-overhaul Fase 2 (frequentie/anti-spam): twee aparte
-- mechanismen tegen het "dagelijks vol meldingen"-gevoel bij veel
-- activiteit, bovenop de bestaande per-categorie kanaalkeuze (push/e-mail/
-- beide/uit, 0079) en de rolgebaseerde zichtbaarheid (Fase 1):
--
-- 1. E-maildigest voor de drie types met de meeste volume-pieken
--    (new_activity, feed_comment, feed_mention): een lid kiest per type
--    "direct" (huidig gedrag) of "dagelijkse samenvatting" (één verzamel-
--    mail per dag i.p.v. losse mails). Vercel Hobby staat cron maximaal
--    1x per dag toe (zie vercel.json: alle bestaande cronjobs draaien al
--    1x/dag) — "dagelijks" is dus het maximaal haalbare interval, geen bug
--    maar een platformgrens.
--    De keuze zelf is hier bewust alleen een kolom met een verstandig
--    gekozen default — het lid-instelscherm ervoor hoort bij Fase 3 (die
--    sowieso al per-type voorkeuren aan de instellingenpagina toevoegt,
--    één scherm i.p.v. twee keer bouwen).
-- 2. Een zachte dagelijkse pushlimiet per lid: na een paar pushes op één
--    dag worden volgende, niet-tijdkritische pushes die dag onderdrukt
--    (niet verstuurd; de melding blijft gewoon zichtbaar in-app). Besluiten
--    óver het lid zelf (waitlist_promoted, activity_decision,
--    company_membership_decision — zelfde redenering als 0079) blijven
--    altijd doorkomen.
--
-- Default-keuzes (user-delegatie: "kies de aanbevolen variant"):
--   a) digest staat AAN voor feed_comment/feed_mention — reactie-/
--      vermeldingverkeer loopt het hardst op bij een drukke dag (meerdere
--      reacties binnen een uur is normaal) en is zelden tijdkritisch.
--      new_activity blijft op "direct": een nieuwe activiteit kan snel vol
--      raken, een lid wil daar liever meteen van weten dan een dag later.
--   b) zachte pushlimiet: 8 per dag — ruim genoeg voor een normale drukke
--      dag (activiteit + een paar reacties/vermeldingen + een herinnering),
--      krap genoeg om een uitzonderlijke piek niet ongebreideld door te
--      laten. Zie PUSH_DAILY_SOFT_LIMIT in dispatch-push.ts.

-- 1a. Digest-voorkeur per lid. email_activities/email_feed (0037/0038)
-- blijven ongewijzigd: digest is een e-mail-specifieke extra keuze binnen
-- "e-mail staat aan voor deze categorie", geen vervanging van het
-- push/e-mail/beide/uit-kanaal zelf.
alter table public.profiles
  add column email_digest_new_activity boolean not null default false,
  add column email_digest_feed_comment boolean not null default true,
  add column email_digest_feed_mention boolean not null default true;

grant update (email_digest_new_activity, email_digest_feed_comment, email_digest_feed_mention)
  on public.profiles to authenticated;

-- 1b. get_pending_email_notifications (0134) sloeg tot nu toe rijen alleen
-- over op basis van kanaalvoorkeur (uitgezet) — nu óók als het lid voor
-- digest koos voor dit type. Zulke rijen blijven emailed_at NULL (niet
-- "overslaan", wel "nu niet direct versturen") zodat de nieuwe digest-cron
-- (get_pending_email_digest_notifications hieronder) ze oppikt.
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
  select l.id, l.type, l.title, l.body, l.link, p.email
  from leased l
  join public.profiles p on p.id = l.profile_id;
end;
$$;

-- 1c. Nieuwe RPC voor de dagelijkse digest-cron: dezelfde claim-lease
-- (email_claimed_at, 10 minuten) als hierboven, zodat een trage/herhaalde
-- cron-aanroep niet dezelfde rijen dubbel in twee verzamel-mails stopt.
-- Groeperen per lid + de mail zelf bouwen gebeurt in TypeScript
-- (dispatch-email-digest.ts); deze functie claimt en levert de ruwe rijen.
create or replace function public.get_pending_email_digest_notifications(p_limit integer default 500)
returns table (
  notification_id uuid,
  profile_id uuid,
  type text,
  title text,
  body text,
  link text,
  email text,
  created_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
begin
  return query
  with claimed as (
    select n.id
    from public.notifications n
    join public.profiles p on p.id = n.profile_id
    where n.emailed_at is null
      and n.communication_id is null
      and (n.email_claimed_at is null or n.email_claimed_at < now() - interval '10 minutes')
      and (
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
    returning n.id, n.type, n.title, n.body, n.link, n.profile_id, n.created_at
  )
  select l.id, l.profile_id, l.type, l.title, l.body, l.link, p.email, l.created_at
  from leased l
  join public.profiles p on p.id = l.profile_id;
end;
$$;

revoke execute on function public.get_pending_email_digest_notifications(integer) from anon, authenticated;
grant execute on function public.get_pending_email_digest_notifications(integer) to service_role;

-- 2a. get_pending_push_notifications (0133) gaf nooit profile_id terug in
-- zijn Returns table, hoewel het TypeScript-type (src/lib/types/database.ts)
-- dat altijd al beloofde en dispatch-push.ts 'm ook al doorgaf aan
-- logPushUnsubscribed — altijd undefined dus, een bestaand, stil gebrek.
-- Nodig voor de nieuwe pushlimiet hieronder (claim_push_send_slot neemt het
-- profiel), dus hier gelijk gefixt. Drop+create omdat de kolomlijst van de
-- RETURNS TABLE wijzigt (create or replace kan dat niet).
drop function if exists public.get_pending_push_notifications(integer);

create function public.get_pending_push_notifications(p_limit integer default 50)
returns table (
  notification_id uuid,
  type text,
  title text,
  body text,
  link text,
  profile_id uuid,
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
  select m.id, m.type, m.title, m.body, m.link, m.profile_id, s.endpoint, s.p256dh, s.auth
  from marked m
  join public.push_subscriptions s on s.profile_id = m.profile_id;
end;
$$;

revoke execute on function public.get_pending_push_notifications(integer) from anon, authenticated;
grant execute on function public.get_pending_push_notifications(integer) to service_role;

-- 2b. Dagtelling + zachte limiet. Eigen tabel i.p.v. een kolom op profiles:
-- moet elke dag weer op 0 beginnen zonder een aparte reset-cron. RLS staat
-- aan zonder policies — geen enkele clientrol heeft hier iets aan af te
-- lezen of te wijzigen, alleen de security-definer-functie hieronder (als
-- functie-eigenaar, buiten RLS om) raakt deze tabel aan.
create table public.push_daily_send_counts (
  profile_id uuid not null references public.profiles (id) on delete cascade,
  send_date date not null,
  count integer not null default 0,
  primary key (profile_id, send_date)
);

alter table public.push_daily_send_counts enable row level security;

-- Atomisch: claimt één pushslot voor dit lid/type en geeft terug of de
-- verzending door mag gaan. Tijdkritische types (besluiten óver het lid
-- zelf, zie 0079) slaan de teller/limiet helemaal over. p_daily_limit komt
-- als argument mee (niet hardcoded) zodat de waarde op één plek (een
-- constante in dispatch-push.ts) blijft staan i.p.v. verspreid over SQL en
-- TypeScript.
create or replace function public.claim_push_send_slot(p_profile_id uuid, p_type text, p_daily_limit integer)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_critical constant text[] := array['waitlist_promoted', 'activity_decision', 'company_membership_decision'];
  v_count integer;
begin
  if p_type = any(v_critical) then
    return true;
  end if;

  insert into public.push_daily_send_counts (profile_id, send_date, count)
  values (p_profile_id, (now() at time zone 'Europe/Amsterdam')::date, 1)
  on conflict (profile_id, send_date) do update set count = public.push_daily_send_counts.count + 1
  returning count into v_count;

  return v_count <= p_daily_limit;
end;
$$;

revoke execute on function public.claim_push_send_slot(uuid, text, integer) from anon, authenticated;
grant execute on function public.claim_push_send_slot(uuid, text, integer) to service_role;
