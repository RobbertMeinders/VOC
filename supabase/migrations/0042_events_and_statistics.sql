-- Fase E: lichte, generieke events-tabel voor de vijf betekenisvolle
-- gebeurtenissen die nergens al staan (zie plan) — geen volledig
-- tracking-/analyticsysteem, en geen aparte tabel per gebeurtenis. Alles
-- wat al ergens anders staat (aanmeldingen, aanwezigen, likes, reacties,
-- nieuwe pushabonnementen) wordt in Statistieken rechtstreeks uit die
-- bestaande tabellen gelezen, niet hier nogmaals bijgehouden.

create table public.events (
  id uuid primary key default gen_random_uuid(),
  event_type text not null,
  profile_id uuid references public.profiles (id) on delete set null,
  target_type text,
  target_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index events_type_created_idx on public.events (event_type, created_at desc);
create index events_target_idx on public.events (target_type, target_id);

alter table public.events enable row level security;

-- Alleen bestuur/beheer leest dit terug (Statistieken); inserts gaan altijd
-- via de security-definer RPC's hieronder, nooit rechtstreeks.
create policy "events_board_select" on public.events
  for select using (public.is_board());

-- Voor in-app weergaven (bericht/activiteit/document bekeken): profile_id
-- komt altijd uit auth.uid() zelf, nooit van de client — no-op zonder
-- ingelogde gebruiker i.p.v. een foutmelding, want view-tracking mag nooit
-- de pagina breken.
create or replace function public.log_event(
  p_event_type text,
  p_target_type text default null,
  p_target_id uuid default null,
  p_metadata jsonb default '{}'::jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    return;
  end if;

  insert into public.events (event_type, profile_id, target_type, target_id, metadata)
  values (p_event_type, auth.uid(), p_target_type, p_target_id, p_metadata);
end;
$$;

grant execute on function public.log_event(text, text, uuid, jsonb) to authenticated;

-- Voor een pushmelding-klik vanuit de service worker (sw.js), die geen
-- ingelogde sessie hoeft mee te sturen: het profiel wordt hier server-side
-- afgeleid uit de notificatie-id zelf (nooit client-supplied), dus geen
-- auth nodig om te weten van wie de klik was.
create or replace function public.log_notification_click(p_notification_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_profile_id uuid;
begin
  select profile_id into v_profile_id from public.notifications where id = p_notification_id;
  if v_profile_id is not null then
    insert into public.events (event_type, profile_id, target_type, target_id, metadata)
    values ('notification_opened', v_profile_id, 'notification', p_notification_id, jsonb_build_object('channel', 'push'));
  end if;
end;
$$;

grant execute on function public.log_notification_click(uuid) to anon, authenticated;

-- Voor opzeggen (unsubscribeFromPushAction, wel ingelogd) én de automatische
-- opruiming van dode abonnementen (send-push-cron, anoniem/geen
-- auth.uid()-context) — verwijdert de abonnement-rij zelf (idempotent: een
-- tweede aanroep voor hetzelfde endpoint raakt gewoon nul rijen) én logt de
-- gebeurtenis. Security definer is hier ook nodig voor de delete zelf: de
-- bestaande push_subscriptions_self_delete-policy (0001_init.sql) is
-- eigenaar-only en liet de cron (anonieme/CRON_SECRET-context, geen
-- auth.uid()) dode abonnementen nooit écht verwijderen — die deletes liepen
-- steeds stil vast op RLS.
create or replace function public.log_push_unsubscribed(p_endpoint text, p_profile_id uuid default null)
returns void
language sql
security definer
set search_path = public
as $$
  delete from public.push_subscriptions where endpoint = p_endpoint;
  insert into public.events (event_type, profile_id, target_type, metadata)
  values ('push_unsubscribed', p_profile_id, 'push_subscription', jsonb_build_object('endpoint', p_endpoint));
$$;

grant execute on function public.log_push_unsubscribed(text, uuid) to anon, authenticated;

-- record_manual_push_broadcast (0041) logt vanaf nu ook een
-- push_unsubscribed-event per opgeruimd dood endpoint, naast de bestaande
-- delete — zelfde reden als hierboven, nu voor consistente cijfers in
-- Statistieken > Notificaties.
create or replace function public.record_manual_push_broadcast(
  p_reached_profile_ids uuid[],
  p_dead_endpoints text[],
  p_title text,
  p_body text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_board() then
    raise exception 'not authorized';
  end if;

  insert into public.notifications (profile_id, type, title, body, pushed_at)
  select unnest(p_reached_profile_ids), 'manual_broadcast', p_title, p_body, now();

  if array_length(p_dead_endpoints, 1) > 0 then
    insert into public.events (event_type, target_type, metadata)
    select 'push_unsubscribed', 'push_subscription', jsonb_build_object('endpoint', endpoint)
    from unnest(p_dead_endpoints) as endpoint;

    delete from public.push_subscriptions where endpoint = any(p_dead_endpoints);
  end if;
end;
$$;

-- created_at toegevoegd aan de return-kolommen van list_push_subscriptions
-- (0041_manual_push_broadcast.sql), nodig voor de "nieuwe abonnementen"-
-- telling in Statistieken > Notificaties — .from("push_subscriptions")
-- rechtstreeks levert onder RLS (push_subscriptions_self_select,
-- eigenaar-only) alleen de eigen rij(en) van de inloggende beheerder op,
-- dus ook tellingen moeten via deze security-definer RPC.
drop function if exists public.list_push_subscriptions();

create function public.list_push_subscriptions()
returns table (profile_id uuid, endpoint text, p256dh text, auth text, created_at timestamptz)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_board() then
    raise exception 'not authorized';
  end if;

  return query select s.profile_id, s.endpoint, s.p256dh, s.auth, s.created_at from public.push_subscriptions s;
end;
$$;

grant execute on function public.list_push_subscriptions() to authenticated;

-- profile_id toegevoegd aan de return-kolommen, nodig zodat de 404/410-
-- opruiming in /api/cron/send-push een push_unsubscribed-event met het
-- juiste profiel kan loggen (was voorheen alleen bekend via de losse
-- push_subscriptions-rij, niet via deze RPC). Kolommen wijzigen kan niet
-- via create or replace, dus eerst droppen (zelfde als bij 0039/0040).
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
    and (
      not n.channel_push_allowed
      or (n.type in ('new_activity', 'activity_reminder', 'waitlist_promoted') and not p.push_activities)
      or (n.type in ('feed_comment', 'feed_mention') and not p.push_feed)
      or (n.type = 'new_member' and not p.push_new_members)
    );

  return query
  select n.id, n.type, n.title, n.body, n.link, s.profile_id, s.endpoint, s.p256dh, s.auth
  from public.notifications n
  join public.push_subscriptions s on s.profile_id = n.profile_id
  where n.pushed_at is null
  order by n.created_at
  limit p_limit;
end;
$$;

grant execute on function public.get_pending_push_notifications(integer) to anon, authenticated;
