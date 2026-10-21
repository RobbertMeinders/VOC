-- Beveiligingsfixlijst Blok 2, M3: access_requests_public_insert (0004) en
-- testfase_feedback_insert (0124) laten de aanroeper zelf created_at (en,
-- bij access_requests, status) meesturen — er is geen kolom-grant of
-- trigger die dat afdwingt. Wie rechtstreeks tegen Supabase's REST-API
-- post (de publieke anon-sleutel staat toch al in elke bezoekersbrowser),
-- kan daarmee created_at in het verleden zetten en zo de bestaande
-- per-e-mailadres/per-lid rate-limit-triggers (0120/0124) volledig omzeilen
-- — die tellen immers op basis van diezelfde kolom. Beide triggers zetten
-- 'm hieronder onvoorwaardelijk zelf, ongeacht wat de client meestuurt.
create or replace function public.enforce_access_request_rate_limit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_normalized_email text := lower(trim(new.email));
  v_recent_attempts integer;
  v_recent_total integer;
begin
  new.created_at := now();
  new.status := 'pending';

  select count(*) into v_recent_attempts
    from public.access_requests
    where lower(email) = v_normalized_email
      and created_at > now() - interval '15 minutes';

  if v_recent_attempts >= 5 then
    raise exception 'Te veel aanvragen met dit e-mailadres. Probeer het over een kwartier opnieuw.';
  end if;

  -- Los van het per-e-mailadres-limiet hierboven: dit formulier is volledig
  -- anoniem bereikbaar, dus een script dat telkens een ander e-mailadres
  -- gebruikt, omzeilt dat limiet moeiteloos. Een algemene bovengrens per
  -- tijdvak (onafhankelijk van welk e-mailadres) maakt dat soort
  -- grootschalig misbruik ook onmogelijk, zonder het legitieme, lage
  -- volume van dit formulier te raken.
  select count(*) into v_recent_total
    from public.access_requests
    where created_at > now() - interval '1 hour';

  if v_recent_total >= 30 then
    raise exception 'Er zijn momenteel te veel aanvragen binnengekomen. Probeer het later opnieuw.';
  end if;

  return new;
end;
$$;

create or replace function public.enforce_testfase_feedback_rate_limit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_recent_count integer;
begin
  new.created_at := now();

  select count(*) into v_recent_count
    from public.testfase_feedback
    where profile_id = new.profile_id
      and created_at > now() - interval '1 day';

  if v_recent_count >= 10 then
    raise exception 'Je hebt vandaag al genoeg feedback achtergelaten. Probeer het morgen opnieuw.';
  end if;

  return new;
end;
$$;
