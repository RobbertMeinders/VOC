-- Communicatieplan (zie docs-overleg): twee correcties op wie een
-- pushmelding/e-mail krijgt, geen wijziging aan tabellen of kolommen nodig —
-- alleen de WHERE-clausules in de twee bestaande "pending"-RPC's.
--
-- 1. "new_member" krijgt nooit meer een automatische push/e-mail. Blijft
--    gewoon zichtbaar in de notificatiebel en de ledenlijst; alleen de
--    instant-melding bij élk nieuw lid verdwijnt (te lage urgentie voor een
--    kanaal buiten de app, en voorkwam dat leden standaard dubbel — push én
--    mail — over hetzelfde nieuwe lid werden gemeld). De kolommen
--    push_new_members/email_new_members blijven ongebruikt in de tabel
--    staan (geen migratie-noodzaak om ze te verwijderen).
-- 2. "waitlist_promoted" verhuist van de categorie-gestuurde "Activiteiten"-
--    voorkeur naar altijd-aan — net als company_membership_decision en
--    activity_decision is dit een besluit óver het lid zelf (je staat nu
--    daadwerkelijk op de lijst), geen "fyi er is iets nieuws"-melding, en
--    hoort dus niet uit te kunnen vallen omdat iemand pushmeldingen voor
--    activiteiten in het algemeen heeft uitgezet.
--
-- create or replace (i.p.v. drop+create zoals 0067) kan hier gewoon: de
-- OUT-parameters blijven ongewijzigd t.o.v. 0067_newsletter_send.sql, dus
-- bestaande rechten (grant ... to service_role) blijven intact.
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
  select n.id, n.type, n.title, n.body, n.link, s.endpoint, s.p256dh, s.auth
  from public.notifications n
  join public.push_subscriptions s on s.profile_id = n.profile_id
  where n.pushed_at is null
    and n.communication_id is null
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
    and n.communication_id is null
    and (
      not n.channel_email_allowed
      or n.type = 'new_member'
      or (n.type in ('new_activity', 'activity_reminder') and not p.email_activities)
      or (n.type in ('feed_comment', 'feed_mention') and not p.email_feed)
    );

  return query
  select n.id, n.type, n.title, n.body, n.link, p.email
  from public.notifications n
  join public.profiles p on p.id = n.profile_id
  where n.emailed_at is null
    and n.communication_id is null
  order by n.created_at
  limit p_limit;
end;
$$;

-- Communicatieplan: nieuwe profielen starten op "Pushmelding" voor
-- Activiteiten en Reacties & vermeldingen i.p.v. de oude default (beide
-- kanalen tegelijk aan), zodat een nieuw lid niet standaard dubbel gemeld
-- wordt. Bestaande leden houden hun huidige, zelf ingestelde voorkeur.
alter table public.profiles
  alter column email_activities set default false,
  alter column email_feed set default false;

-- Communicatieplan: de melder van een rapportage hoorde tot nu toe nooit
-- iets terug als zijn melding was afgehandeld. Alleen in-app (geen
-- push/mail, vandaar channel_push_allowed/channel_email_allowed = false
-- hieronder) — dit is geen tijdkritische melding. Een losse, kleine
-- security-definer RPC i.p.v. een rechtstreekse insert vanuit de server-
-- actie: er bestaat geen insert-policy op notifications (alle bestaande
-- meldingen komen uit trigger-functies of crons), en reporter_id zelf
-- opzoeken i.p.v. laten meesturen voorkomt dat een client een melding naar
-- een willekeurig ander profiel zou kunnen laten sturen.
create or replace function public.notify_report_resolved(p_report_id uuid, p_decision text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_reporter_id uuid;
begin
  if not public.is_board() then
    raise exception 'not authorized';
  end if;

  select reporter_id into v_reporter_id from public.feed_post_reports where id = p_report_id;
  if v_reporter_id is null then
    return;
  end if;

  insert into public.notifications (profile_id, type, title, body, channel_push_allowed, channel_email_allowed)
  values (
    v_reporter_id,
    'report_resolved',
    'Je melding is behandeld',
    case
      when p_decision = 'deleted' then 'Het gemelde bericht is verwijderd.'
      else 'De melding is beoordeeld; het bericht blijft staan.'
    end,
    false,
    false
  );
end;
$$;

grant execute on function public.notify_report_resolved(uuid, text) to authenticated;
