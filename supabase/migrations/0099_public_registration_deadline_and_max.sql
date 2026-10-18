-- F6: upsert_public_activity_registration (0060) controleerde alleen of de
-- activiteit goedgekeurd is en open staat voor publieke aanmelding — niet
-- registration_deadline of max_participants, in tegenstelling tot de
-- ledenkant (enforce_activity_registration_rules, 0082). Een extern iemand
-- kon zich dus via de website nog aanmelden na de deadline of als de
-- activiteit al vol was. De capaciteitscheck telt leden (niet-wachtlijst)
-- én eerdere externe aanmeldingen samen, omdat max_participants de
-- werkelijke ruimte op de activiteit zelf beperkt, niet alleen het
-- ledenaandeel. Beide checks gelden alleen bij een NIEUWE aanmelding — wie
-- al stond aangemeld mag zijn eigen naam/bedrijfsnaam altijd nog bijwerken.
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
begin
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
