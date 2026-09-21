-- Twee nieuwe brede notificaties, naast de al bestaande, gerichte:
-- 1. Een nieuw lid → alle overige actieve leden.
-- 2. Een activiteit wordt zichtbaar/goedgekeurd (direct door bestuur
--    aangemaakt, of een community-inzending die net is goedgekeurd) → alle
--    actieve leden behalve de indiener (die krijgt via
--    notify_activity_decision, 0015, al zijn eigen "goedgekeurd"-bericht).

create or replace function public.notify_new_member()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.is_active then
    insert into public.notifications (profile_id, type, title, body, link)
    select id, 'new_member', 'Nieuw lid',
      new.first_name || ' ' || new.last_name || ' is lid geworden van de VOC.',
      '/leden/' || new.id
    from public.profiles
    where is_active and id <> new.id;
  end if;
  return new;
end;
$$;

create trigger profiles_notify_new_member
  after insert on public.profiles
  for each row execute function public.notify_new_member();

create or replace function public.notify_activity_published()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status = 'approved' and (tg_op = 'INSERT' or old.status is distinct from 'approved') then
    insert into public.notifications (profile_id, type, title, body, link)
    select id, 'new_activity', 'Nieuwe activiteit: ' || new.title,
      'Op ' || to_char(new.starts_at at time zone 'Europe/Amsterdam', 'DD-MM-YYYY "om" HH24:MI') ||
        coalesce(' bij ' || new.location, '') || '.',
      '/agenda/' || new.id
    from public.profiles
    where is_active and (new.created_by is null or id <> new.created_by);
  end if;
  return new;
end;
$$;

create trigger activities_notify_published
  after insert or update on public.activities
  for each row execute function public.notify_activity_published();
