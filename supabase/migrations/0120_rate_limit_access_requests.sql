-- Security-audit bevinding: access_requests_public_insert (0004/0022) staat
-- anon toe rechtstreeks een rij in te voegen — nodig voor het publieke
-- "toegang aanvragen"-formulier, dat geen account heeft om op te leunen.
-- submitAccessRequestAction (toegang-aanvragen/actions.ts) past zelf al
-- isEmailRateLimited() toe, maar dat is alleen een poort in de Next.js-laag:
-- wie rechtstreeks tegen Supabase's REST-API `POST /access_requests` doet
-- (de publieke anon-sleutel staat toch al in elke bezoekersbrowser) omzeilt
-- die limiet volledig — en elke geslaagde insert stuurt via
-- access_requests_notify (0022) ook meteen een melding naar bestuur/beheer,
-- dus dit was zowel een opslag- als een notificatie-spamvector. Dezelfde
-- limiet (5 per e-mailadres per 15 minuten, zelfde window/drempel als
-- isEmailRateLimited in rate-limit.ts) nu ook afgedwongen met een
-- BEFORE INSERT-trigger, los van de aanroeper.
create or replace function public.enforce_access_request_rate_limit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_normalized_email text := lower(trim(new.email));
  v_recent_attempts integer;
begin
  select count(*) into v_recent_attempts
    from public.access_requests
    where lower(email) = v_normalized_email
      and created_at > now() - interval '15 minutes';

  if v_recent_attempts >= 5 then
    raise exception 'Te veel aanvragen met dit e-mailadres. Probeer het over een kwartier opnieuw.';
  end if;

  return new;
end;
$$;

drop trigger if exists access_requests_rate_limit on public.access_requests;
create trigger access_requests_rate_limit
  before insert on public.access_requests
  for each row execute function public.enforce_access_request_rate_limit();
