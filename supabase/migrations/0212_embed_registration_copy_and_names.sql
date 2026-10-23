-- Addendum bij de personenmodel-bouwbrief ("Embed-vormgeving, aanmeld-flow
-- en scrollbalk"), afgestemd met Robbert. Twee wijzigingen aan
-- upsert_public_activity_registration (laatst 0211):
--
--  1) Een leden-only activiteit (allow_public_registration = false) toont
--     voortaan een e-mail-only formulier voor "wel lid, nog geen account" --
--     geen naam/bedrijfsnaam meer. Bij een match met een openstaande
--     uitnodiging gebruikt de aanmelding daarom voortaan de naam/bedrijfsnaam
--     van die uitnodiging zelf (we kennen die immers al), i.p.v. de
--     (in dat formulier niet meer bestaande) p_name/p_company_name-velden.
--     Bij het volledige formulier (open activiteit) blijft het zelf
--     ingevulde p_name/p_company_name het vangnet als de uitnodiging zelf
--     geen naam/bedrijf heeft.
--  2) Duidelijkere, mensgerichte foutmelding wanneer een leden-only
--     activiteit een e-mailadres niet herkent (geen match, dus geblokkeerd):
--     i.p.v. de generieke "staat niet open voor aanmelden" nu een tekst die
--     naar het nieuwsbriefadres en info@vocveendam.nl wijst -- nooit een
--     kale muur.
create or replace function public.upsert_public_activity_registration(
  p_activity_id uuid,
  p_name text,
  p_email text,
  p_company_name text
)
returns table (person_status text, waitlisted boolean)
language plpgsql
security definer
set search_path = public
as $$
#variable_conflict use_column
declare
  v_deadline timestamptz;
  v_max integer;
  v_status text;
  v_allow boolean;
  v_existing record;
  v_confirmed_count integer;
  v_normalized_email text := lower(trim(p_email));
  v_recent_attempts integer;
  v_profile_id uuid;
  v_has_invitation boolean;
  v_invitation_name text;
  v_invitation_company_name text;
  v_insert_name text;
  v_insert_company_name text;
  v_waitlisted boolean;
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

  if v_status is distinct from 'approved' then
    raise exception 'Deze activiteit staat niet open voor aanmelden.';
  end if;

  if v_deadline is not null and now() > v_deadline then
    raise exception 'De aanmelddeadline voor deze activiteit is verstreken.';
  end if;

  select p.id into v_profile_id from public.profiles p where lower(p.email) = v_normalized_email;

  if v_profile_id is not null then
    insert into public.activity_registrations (activity_id, profile_id)
    values (p_activity_id, v_profile_id)
    on conflict (activity_id, profile_id) do nothing;

    select r.is_waitlisted into v_waitlisted
      from public.activity_registrations r
      where r.activity_id = p_activity_id and r.profile_id = v_profile_id;

    return query select 'lid'::text, coalesce(v_waitlisted, false);
    return;
  end if;

  select
    nullif(trim(coalesce(i.first_name, '') || ' ' || coalesce(i.last_name, '')), ''),
    c.name
    into v_invitation_name, v_invitation_company_name
  from public.invitations i
  left join public.companies c on c.id = i.company_id
  where lower(i.email) = v_normalized_email and i.status = 'pending'
  limit 1;

  v_has_invitation := found;

  if not coalesce(v_allow, false) and not v_has_invitation then
    raise exception 'Dit adres kennen we niet als lid. Gebruik het adres waarop je de nieuwsbrief krijgt, of mail ons op info@vocveendam.nl, dan helpen we je.';
  end if;

  -- Embed-vormgeving-opdracht: het leden-only formulier vraagt alleen een
  -- e-mailadres -- bij een uitnodigingsmatch is de naam/bedrijfsnaam dus
  -- vaak leeg (p_name/p_company_name) en gebruiken we die van de
  -- uitnodiging zelf; bij het volledige (open-activiteit) formulier blijft
  -- het zelf ingevulde p_name/p_company_name het eerste vangnet.
  v_insert_name := case
    when v_has_invitation then coalesce(v_invitation_name, nullif(trim(p_name), ''), 'Onbekend lid')
    else coalesce(nullif(trim(p_name), ''), 'Onbekend lid')
  end;
  v_insert_company_name := case
    when v_has_invitation then coalesce(v_invitation_company_name, nullif(trim(p_company_name), ''))
    else nullif(trim(p_company_name), '')
  end;

  select name, company_name into v_existing
    from public.public_activity_registrations
    where activity_id = p_activity_id and email = p_email;

  if found then
    if v_existing.name is distinct from v_insert_name or v_existing.company_name is distinct from v_insert_company_name then
      raise exception 'Er staat al een aanmelding met dit e-mailadres voor deze activiteit. Neem contact op met het bestuur als dit niet klopt.';
    end if;
    -- Identieke herhaling (bv. een dubbelklik) -- stil niets doen.
    return query select (case when v_has_invitation then 'lid_zonder_account' else 'geen_lid' end)::text, false;
    return;
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

  begin
    insert into public.public_activity_registrations (activity_id, name, email, company_name)
    values (p_activity_id, v_insert_name, p_email, v_insert_company_name);
  exception
    when unique_violation then
      -- Race condition: twee gelijktijdige aanmeldingen met hetzelfde
      -- e-mailadres kwamen allebei langs de check hierboven voordat de
      -- eerste z'n rij had ingevoegd. Zelfde nette foutmelding i.p.v. een
      -- rauwe databasefout.
      raise exception 'Er staat al een aanmelding met dit e-mailadres voor deze activiteit. Neem contact op met het bestuur als dit niet klopt.';
  end;

  return query select (case when v_has_invitation then 'lid_zonder_account' else 'geen_lid' end)::text, false;
end;
$$;

insert into public.schema_migration_log (version) values ('0212') on conflict (version) do nothing;
notify pgrst, 'reload schema';
