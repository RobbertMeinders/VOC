-- Fase D: bestuur/beheer verstuurt handmatig een pushbericht naar alle
-- abonnementen (Beheer → Handmatig pushbericht), los van de automatische
-- notificaties. De webpush-verzending zelf gebeurt in Node
-- (pushbericht/actions.ts, zelfde web-push-opzet als /api/cron/send-push),
-- maar zowel het lezen van alle abonnementen als het wegschrijven van het
-- resultaat moet via een security-definer RPC: push_subscriptions_self_select
-- (0001_init.sql) laat een lid alleen zijn eigen abonnement zien, en er
-- bestaat geen insert-policy op notifications (rijen ontstaan alleen
-- server-side, zie 0001_init.sql).

create or replace function public.list_push_subscriptions()
returns table (profile_id uuid, endpoint text, p256dh text, auth text)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_board() then
    raise exception 'not authorized';
  end if;

  return query select s.profile_id, s.endpoint, s.p256dh, s.auth from public.push_subscriptions s;
end;
$$;

grant execute on function public.list_push_subscriptions() to authenticated;

-- Eén aanroep na afloop van het versturen: per bereikt abonnement een
-- notifications-rij (type "manual_broadcast", meteen pushed_at gezet, net
-- als een automatische push) plus opruimen van de abonnementen die tijdens
-- het versturen 404/410 teruggaven (browser-data gewist, toestemming
-- ingetrokken, …) — zelfde opruimlogica als /api/cron/send-push.
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
    delete from public.push_subscriptions where endpoint = any(p_dead_endpoints);
  end if;
end;
$$;

grant execute on function public.record_manual_push_broadcast(uuid[], text[], text, text) to authenticated;
