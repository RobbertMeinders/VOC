-- Fase 8: de daadwerkelijke verzendarchitectuur voor nieuwsbrieven. Gebouwd
-- na expliciet akkoord van het bestuur op dit ontwerp (zie de analyse
-- "Communicatiemodule VOC Ledenportaal", sectie J) — het schema zelf lag
-- al vast in 0065_communications.sql.
--
-- Kernprobleem dat dit ontwerp oplost: nooit een halve verzending als
-- "succesvol verzonden" rapporteren. Elke ontvanger krijgt zijn eigen
-- notifications-rij (communication_id + emailed_at), en die rij wordt pas
-- gemarkeerd als verzonden nadat de e-mail ook écht is verstuurd — nooit
-- vooraf, nooit in bulk. "Opnieuw proberen" na een gedeeltelijke mislukking
-- berekent simpelweg opnieuw wie nog een lege emailed_at heeft.

-- Bestaande pending-RPC's voor de automatische push/e-mail-crons mogen
-- nieuwsbriefnotificaties nooit oppikken — die hebben hun eigen,
-- rechtstreekse verzendpad (sendNewsletterAction, niet de generieke
-- cron/template-flow). communication_id is not null is daarvoor het enige,
-- ondubbelzinnige onderscheid (channel_push_allowed/channel_email_allowed
-- worden ook op false gezet bij het aanmaken, maar zijn als enige check
-- gevoelig voor een race met de eigen "markeer als afgehandeld"-stap van
-- deze functies hieronder).
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
      or (n.type in ('new_activity', 'activity_reminder', 'waitlist_promoted') and not p.push_activities)
      or (n.type in ('feed_comment', 'feed_mention') and not p.push_feed)
      or (n.type = 'new_member' and not p.push_new_members)
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
      or (n.type in ('new_activity', 'activity_reminder', 'waitlist_promoted') and not p.email_activities)
      or (n.type in ('feed_comment', 'feed_mention') and not p.email_feed)
      or (n.type = 'new_member' and not p.email_new_members)
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

-- Voorkomt een dubbele e-mail als "Versturen" twee keer vlak na elkaar
-- wordt aangeklikt (dubbelklik, of twee bestuursleden tegelijk): zonder
-- deze constraint zouden twee gelijktijdige claim-aanroepen allebei de
-- "bestaat nog niet"-check voor hetzelfde lid kunnen doorstaan vóór een
-- van beide zijn insert voltooit.
create unique index if not exists notifications_communication_profile_uniq
  on public.notifications (communication_id, profile_id)
  where communication_id is not null;

-- Bewust géén "in-app bel"-weergave voor deze rijen (zie notificaties/
-- page.tsx en de ongelezen-telling in layout.tsx, die type 'newsletter'
-- straks uitsluiten) — een lid leest de nieuwsbrief al via e-mail zelf,
-- een extra bel-melding zonder bruikbare link voegt niks toe.
--
-- Idempotent: opnieuw aanroepen voor dezelfde communicatie slaat leden die
-- al een rij hebben over, en geeft alléén de nog openstaande ontvangers
-- terug (emailed_at is null) — dat is tegelijk het volledige "opnieuw
-- proberen"-mechanisme, geen aparte retry-functie nodig.
create or replace function public.claim_newsletter_recipients(p_communication_id uuid)
returns table (notification_id uuid, profile_id uuid, email text)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_board() then
    raise exception 'not authorized';
  end if;

  insert into public.notifications (profile_id, type, title, communication_id, channel_push_allowed, channel_email_allowed)
  select p.id, 'newsletter', c.subject, c.id, false, false
  from public.profiles p
  cross join public.communications c
  where c.id = p_communication_id
    and p.is_active
  on conflict (communication_id, profile_id) where communication_id is not null do nothing;

  -- Alleen bij de eerste aanroep gezet (sectie J: "stabiel ook als het
  -- ledenaantal tussentijds verandert") — een retry telt nooit opnieuw.
  update public.communications
  set total_recipients = (select count(*) from public.notifications where communication_id = p_communication_id)
  where id = p_communication_id and total_recipients is null;

  return query
  select n.id, n.profile_id, p.email
  from public.notifications n
  join public.profiles p on p.id = n.profile_id
  where n.communication_id = p_communication_id
    and n.emailed_at is null;
end;
$$;

grant execute on function public.claim_newsletter_recipients(uuid) to authenticated;

-- Eén rij per succesvolle verzending, direct na de Resend-aanroep (nooit
-- gebufferd/gebatcht) — zodat een afgebroken verzendpoging halverwege nooit
-- stiekem al-verstuurde e-mails dubbel verstuurt bij een volgende poging.
create or replace function public.mark_newsletter_notification_sent(p_notification_id uuid, p_provider_id text default null)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_board() then
    raise exception 'not authorized';
  end if;

  update public.notifications
  set emailed_at = now(), email_provider_id = p_provider_id
  where id = p_notification_id and communication_id is not null;
end;
$$;

grant execute on function public.mark_newsletter_notification_sent(uuid, text) to authenticated;

-- Na afloop van een verzendpoging (geslaagd of niet): telt de echte
-- database-staat (nooit een in-memory teller) en zet status pas op
-- 'verzonden' als werkelijk élke ontvanger een emailed_at heeft — anders
-- 'verzenden_mislukt', zodat de UI altijd het eerlijke "X van Y" laat zien.
create or replace function public.finalize_newsletter_send(p_communication_id uuid)
returns table (total integer, sent integer)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_total integer;
  v_sent integer;
begin
  if not public.is_board() then
    raise exception 'not authorized';
  end if;

  select count(*), count(*) filter (where emailed_at is not null)
  into v_total, v_sent
  from public.notifications
  where communication_id = p_communication_id;

  update public.communications
  set status = case when v_total > 0 and v_sent >= v_total then 'verzonden' else 'verzenden_mislukt' end,
      sent_at = case when v_total > 0 and v_sent >= v_total and sent_at is null then now() else sent_at end
  where id = p_communication_id;

  return query select v_total, v_sent;
end;
$$;

grant execute on function public.finalize_newsletter_send(uuid) to authenticated;
