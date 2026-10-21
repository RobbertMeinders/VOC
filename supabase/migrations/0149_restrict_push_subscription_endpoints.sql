-- Beveiligingsfixlijst Blok 3, M15: push_subscriptions_self_insert liet een
-- ingelogd lid zelf (ook rechtstreeks via de REST-API, buiten
-- subscribeToPushAction om) een willekeurige endpoint-URL opslaan. De
-- pushverzend-cron roept die URL later zelf, server-side, zonder verdere
-- controle aan (webpush.sendNotification) — een interne/willekeurige URL
-- hier zou de server dus een aanvraag naar eigen keuze laten doen (SSRF).
-- Een echte pushsubscriptie komt altijd van de pushdienst van de browser
-- zelf: https, en een van een klein aantal bekende hosts.
--
-- Een BEFORE INSERT-trigger i.p.v. een CHECK constraint: een CHECK wordt
-- bij het toevoegen meteen tegen ALLE bestaande rijen gevalideerd, en zonder
-- live-databasetoegang is niet met zekerheid te zeggen dat elke al
-- opgeslagen, legitieme subscriptie (bv. van een minder gangbare browser)
-- in deze lijst past — dat zou de migratie zelf kunnen laten falen. Een
-- trigger raakt alleen nieuwe inserts, laat bestaande rijen met rust.
create or replace function public.enforce_push_subscription_endpoint()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.endpoint !~ '^https://(fcm\.googleapis\.com|updates\.push\.services\.mozilla\.com|web\.push\.apple\.com|[a-z0-9-]+\.notify\.windows\.com)(/.*)?$' then
    raise exception 'Dit pushendpoint wordt niet ondersteund.';
  end if;
  return new;
end;
$$;

create trigger push_subscriptions_enforce_endpoint
  before insert or update of endpoint on public.push_subscriptions
  for each row execute function public.enforce_push_subscription_endpoint();
