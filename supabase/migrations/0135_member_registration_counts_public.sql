-- Portaal-gezondheidsonderzoek, Blok A5: enforce_activity_registration_rules
-- (ledenkant, bepaalt of een NIEUWE ledenaanmelding op de wachtlijst komt)
-- telde alleen bevestigde LEDEN-aanmeldingen tegen max_participants.
-- upsert_public_activity_registration (de publieke/externe kant, 0099) telt
-- daarentegen al leden + externen samen, met precies de redenering dat
-- max_participants de werkelijke ruimte op de activiteit zelf beperkt, niet
-- alleen het ledenaandeel. Zonder diezelfde telling hier konden leden zich
-- gewoon als "bevestigd" blijven aanmelden nadat externen de activiteit al
-- (mede) vol hadden gemaakt — overboeking boven max_participants.
create or replace function public.enforce_activity_registration_rules()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_deadline timestamptz;
  v_max integer;
  v_status text;
  v_confirmed_count integer;
begin
  select registration_deadline, max_participants, status
    into v_deadline, v_max, v_status
    from public.activities
    where id = new.activity_id
    for update;

  if v_status = 'cancelled' then
    raise exception 'Deze activiteit is afgelast.';
  end if;

  if v_deadline is not null and now() > v_deadline then
    raise exception 'De aanmelddeadline voor deze activiteit is verstreken.';
  end if;

  if v_max is not null then
    select
      (select count(*) from public.activity_registrations where activity_id = new.activity_id and not is_waitlisted)
      + (select count(*) from public.public_activity_registrations where activity_id = new.activity_id)
      into v_confirmed_count;

    new.is_waitlisted := v_confirmed_count >= v_max;
  else
    new.is_waitlisted := false;
  end if;

  return new;
end;
$$;
