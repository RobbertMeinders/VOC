-- VOC-07, na overleg met Robbert: de publieke activiteit-aanmelding
-- (upsert_public_activity_registration, laatst 0173) deed bij een bestaande
-- (activity_id, email)-combinatie altijd een stille "on conflict do update"
-- van naam/bedrijfsnaam -- bedoeld zodat je zelf een typefout kunt
-- herstellen door gewoon opnieuw in te vullen, maar wie andermans
-- e-mailadres weet/raadt kon zo ook diens aanmelding wijzigen. Vanaf nu:
-- dezelfde naam/bedrijfsnaam nogmaals invullen blijft een stille no-op (een
-- dubbelklik moet geen foutmelding geven), een AFWIJKENDE naam/bedrijfsnaam
-- op een al bestaand e-mailadres geeft een duidelijke foutmelding i.p.v.
-- overschrijven. Zelf-corrigeren bij een typefout kan dus niet meer zonder
-- contact met het bestuur -- een bewuste, kleine UX-achteruitgang voor het
-- dichten van dit misbruikpad.
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
  v_existing record;
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

  select name, company_name into v_existing
    from public.public_activity_registrations
    where activity_id = p_activity_id and email = p_email;

  if found then
    if v_existing.name is distinct from p_name or v_existing.company_name is distinct from p_company_name then
      raise exception 'Er staat al een aanmelding met dit e-mailadres voor deze activiteit. Neem contact op met het bestuur als dit niet klopt.';
    end if;
    -- Identieke herhaling (bv. een dubbelklik) -- stil niets doen.
    return;
  end if;

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
end;
$$;

insert into public.schema_migration_log (version) values ('0204') on conflict (version) do nothing;
notify pgrst, 'reload schema';
