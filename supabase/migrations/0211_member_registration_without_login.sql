-- Live feedback van Robbert, met verwijzing naar de oorspronkelijke
-- bouwbrief ("Aanmelden zonder account + personenmodel"): die zei expliciet
-- dat een lid-zonder-account "meetelt als lid", niet dat die alleen een
-- prospect-rij en een bedank-mailtje krijgt. Fase 2 (0209) herkende een
-- e-mailmatch wel, maar schreef 'm nog steeds altijd naar
-- public_activity_registrations i.p.v. een echte aanmelding -- en het hele
-- formulier stond bovendien verstopt achter allow_public_registration, een
-- schakelaar die bedoeld is om ECHTE buitenstaanders (gasten/prospects) te
-- weren, niet om bestaande leden tegen te houden die liever niet inloggen.
--
-- Deze migratie:
--  1) upsert_public_activity_registration herkent nu zelf (niet pas
--     achteraf in de TS-laag) of het ingevulde e-mailadres exact matcht
--     met een bestaand profiel. Zo ja: een ECHTE rij in
--     activity_registrations (dezelfde tabel/trigger als een ingelogde
--     aanmelding via RegisterButton), inclusief wachtlijst via de
--     bestaande enforce_activity_registration_rules-trigger -- ongeacht
--     allow_public_registration. on conflict do nothing voor een
--     dubbelklik (zelfde idempotentie-gedachte als hierboven voor de
--     publieke tabel).
--  2) Matcht het e-mailadres met een openstaande uitnodiging ("lid zonder
--     account"), dan mag de aanmelding ook door ongeacht
--     allow_public_registration (nog steeds in public_activity_
--     registrations, zoals al zo was -- er is immers nog geen profiel om
--     een echte rij aan te hangen). allow_public_registration blokkeert
--     vanaf nu dus alleen nog een e-mailadres dat bij GEEN van beide hoort
--     (een echte onbekende/buitenstaander).
--  3) Geeft person_status + waitlisted terug (i.p.v. niets) zodat de
--     TS-laag de juiste tekst kan tonen zonder nog een aparte round-trip
--     voor alleen de status.
--
-- Postgres staat geen "create or replace" toe die het returntype wijzigt
-- (hier: void -> table(...)) -- eerst de oude functie expliciet weg.
drop function if exists public.upsert_public_activity_registration(uuid, text, text, text);

create function public.upsert_public_activity_registration(
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

  v_has_invitation := exists (
    select 1 from public.invitations i
    where lower(i.email) = v_normalized_email and i.status = 'pending'
  );

  if not coalesce(v_allow, false) and not v_has_invitation then
    raise exception 'Deze activiteit staat niet open voor aanmelden.';
  end if;

  select name, company_name into v_existing
    from public.public_activity_registrations
    where activity_id = p_activity_id and email = p_email;

  if found then
    if v_existing.name is distinct from p_name or v_existing.company_name is distinct from p_company_name then
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
    values (p_activity_id, p_name, p_email, p_company_name);
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

insert into public.schema_migration_log (version) values ('0211') on conflict (version) do nothing;
notify pgrst, 'reload schema';
