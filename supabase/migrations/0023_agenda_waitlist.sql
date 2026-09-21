-- Agenda: wachtlijst voor een volle activiteit (in plaats van aanmelden
-- gewoon te weigeren) + automatische promotie zodra iemand zich afmeldt.

alter table public.activity_registrations
  add column is_waitlisted boolean not null default false;

-- De deadline blijft hard geweigerd; "vol" zet de nieuwe aanmelding nu op
-- de wachtlijst in plaats van 'm te weigeren.
create or replace function public.enforce_activity_registration_rules()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_deadline timestamptz;
  v_max integer;
  v_confirmed_count integer;
begin
  select registration_deadline, max_participants
    into v_deadline, v_max
    from public.activities
    where id = new.activity_id
    for update;

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

-- Zodra een bevestigde aanmelding verdwijnt (afmelden, of bestuur
-- verwijdert iemand), komt de langst-wachtende van de wachtlijst automatisch
-- op de vrijgekomen plek en krijgt daar een notificatie van. Een wachtlijst-
-- plek die zelf wordt opgezegd hoeft niemand te promoveren.
create or replace function public.promote_next_waitlisted()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_next public.activity_registrations;
  v_title text;
begin
  if old.is_waitlisted then
    return old;
  end if;

  select * into v_next
    from public.activity_registrations
    where activity_id = old.activity_id and is_waitlisted
    order by created_at
    limit 1
    for update;

  if v_next.id is null then
    return old;
  end if;

  update public.activity_registrations set is_waitlisted = false where id = v_next.id;

  select title into v_title from public.activities where id = old.activity_id;

  insert into public.notifications (profile_id, type, title, body, link)
  values (
    v_next.profile_id,
    'waitlist_promoted',
    'Je staat nu op de deelnemerslijst',
    'Er is een plek vrijgekomen voor "' || coalesce(v_title, 'de activiteit') || '" — je bent van de wachtlijst gehaald.',
    '/agenda/' || old.activity_id
  );

  return old;
end;
$$;

create trigger activity_registrations_promote_waitlist
  after delete on public.activity_registrations
  for each row execute function public.promote_next_waitlisted();
