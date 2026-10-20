-- Security-audit bevinding: upsert_public_activity_registration (0060,
-- aangescherpt in 0099 met deadline/max-participants-checks) is bewust
-- anoniem aanroepbaar (geen account nodig om je als niet-lid aan te melden
-- via de publieke website-embed). De Next.js-actie ervoor
-- (registerPublicForActivityAction, embed/agenda/actions.ts) past zelf al
-- isEmailRateLimited() toe — maar dat is alleen een poort in de app, niet
-- in de database: wie deze RPC rechtstreeks tegen Supabase's REST-API
-- aanroept (de publieke anon-sleutel staat toch al in elke bezoekersbrowser)
-- omzeilt die rate limit volledig, en kon zo ongelimiteerd nepaanmeldingen
-- insturen — genoeg om het max_participants-plafond van een publieke
-- activiteit vol te proppen vóór echte belangstellenden kunnen reageren.
-- Dezelfde limiet (5 per e-mailadres per 15 minuten) nu ook afgedwongen
-- IN de functie zelf, los van de aanroeper — zelfde window/drempel als
-- isEmailRateLimited (rate-limit.ts), voor consistent gedrag.
create or replace function public.upsert_public_activity_registration(
  p_activity_id uuid,
  p_name text,
  p_email text,
  p_company_name text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_deadline timestamptz;
  v_max integer;
  v_status text;
  v_allow boolean;
  v_exists boolean;
  v_confirmed_count integer;
  v_normalized_email text := lower(trim(p_email));
  v_recent_attempts integer;
begin
  select count(*) into v_recent_attempts
    from public.events
    where event_type = 'public_activity_registration_attempted'
      and created_at > now() - interval '15 minutes'
      and metadata ->> 'email' = v_normalized_email;

  if v_recent_attempts >= 5 then
    raise exception 'Te veel pogingen met dit e-mailadres. Probeer het over een kwartier opnieuw.';
  end if;

  insert into public.events (event_type, metadata)
  values ('public_activity_registration_attempted', jsonb_build_object('email', v_normalized_email));

  select registration_deadline, max_participants, status, allow_public_registration
    into v_deadline, v_max, v_status, v_allow
    from public.activities
    where id = p_activity_id
    for update;

  if v_status is distinct from 'approved' or not coalesce(v_allow, false) then
    raise exception 'Deze activiteit staat niet open voor aanmelden.';
  end if;

  select exists (
    select 1 from public.public_activity_registrations
    where activity_id = p_activity_id and email = p_email
  ) into v_exists;

  if not v_exists then
    if v_deadline is not null and now() > v_deadline then
      raise exception 'De aanmelddeadline voor deze activiteit is verstreken.';
    end if;

    if v_max is not null then
      select
        (select count(*) from public.activity_registrations where activity_id = p_activity_id and not is_waitlisted)
        + (select count(*) from public.public_activity_registrations where activity_id = p_activity_id)
        into v_confirmed_count;

      if v_confirmed_count >= v_max then
        raise exception 'Deze activiteit heeft het maximum aantal deelnemers bereikt.';
      end if;
    end if;
  end if;

  insert into public.public_activity_registrations (activity_id, name, email, company_name)
  values (p_activity_id, p_name, p_email, p_company_name)
  on conflict (activity_id, email)
  do update set name = excluded.name, company_name = excluded.company_name;
end;
$$;
