-- UX-review punt 1: activiteiten konden niet "afgelast" worden — alleen
-- verwijderd (wat aanmeldingen stilletjes cascadeert weg, zonder melding)
-- of gewoon laten staan. Voegt een cancelled-status toe die zichtbaar
-- blijft, niet meer boekbaar is, en de bestaande aanmeldingen behoudt.

alter table public.activities drop constraint if exists activities_status_check;
alter table public.activities add constraint activities_status_check
  check (status in ('pending', 'approved', 'rejected', 'cancelled'));

drop policy if exists "activities_members_select" on public.activities;
create policy "activities_members_select" on public.activities
  for select to authenticated
  using (status in ('approved', 'cancelled') or created_by = auth.uid() or public.is_board());

drop policy if exists "activities_public_select" on public.activities;
create policy "activities_public_select" on public.activities
  for select to anon
  using (source = 'voc' and status in ('approved', 'cancelled'));

-- Stuurt een gerichte in-app/push/e-mail-melding (via de bestaande
-- notifications-tabel, dus dezelfde dispatch-cron als al het andere) naar
-- iedereen die voor deze activiteit is aangemeld — gebruikt bij afgelasten
-- of een belangrijke datum/tijd/locatie-wijziging. Niet-leden
-- (public_activity_registrations heeft geen profile_id, dus geen rij in
-- notifications mogelijk) worden hier niet gemaild — de aanroepende server
-- action doet dat apart via de bestaande sendRawHtmlEmail-helper, met de
-- e-mailadressen die deze functie teruggeeft.
create or replace function public.notify_activity_participants(
  p_activity_id uuid,
  p_type text,
  p_title text,
  p_body text
)
returns table (email text, name text)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_board() then
    raise exception 'Alleen bestuur kan dit.';
  end if;

  insert into public.notifications (profile_id, type, title, body, link)
  select profile_id, p_type, p_title, p_body, '/agenda/' || p_activity_id
  from public.activity_registrations
  where activity_id = p_activity_id;

  return query
  select par.email, par.name
  from public.public_activity_registrations par
  where par.activity_id = p_activity_id;
end;
$$;

grant execute on function public.notify_activity_participants(uuid, text, text, text) to authenticated;

-- Blokkeert aanmelden bij een afgelaste activiteit server-side (niet alleen
-- de knop verbergen in de UI) — zelfde trigger die ook al de deadline
-- afdwingt, dus één plek voor alle aanmeld-regels.
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
    select count(*) into v_confirmed_count
      from public.activity_registrations
      where activity_id = new.activity_id and not is_waitlisted;

    new.is_waitlisted := v_confirmed_count >= v_max;
  else
    new.is_waitlisted := false;
  end if;

  return new;
end;
$$;
