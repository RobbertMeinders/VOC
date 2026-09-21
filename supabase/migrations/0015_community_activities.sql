-- Leden konden geen eigen activiteiten indienen — alleen bestuur mocht
-- iets in de agenda zetten. Vanaf nu kan elk actief lid een activiteit
-- indienen; bestuur/beheer moet die eerst goedkeuren voordat 'm zichtbaar
-- wordt, en VOC-activiteiten (door bestuur zelf aangemaakt) blijven
-- visueel te onderscheiden van door leden ingediende ("community")
-- activiteiten.

alter table public.activities
  add column source text not null default 'voc' check (source in ('voc', 'lid')),
  add column status text not null default 'approved' check (status in ('pending', 'approved', 'rejected'));

-- Nooit vertrouwen op wat de client meestuurt voor source/status: een
-- bestuurslid maakt altijd een official, meteen goedgekeurde activiteit aan;
-- ieder ander lid dient altijd een pending, community-activiteit in. Dat
-- maakt de insert-policy hieronder eenvoudig (elk actief lid mag inserten),
-- zonder dat een lid zichzelf als "voc"/"approved" kan voordoen.
create or replace function public.normalize_activity_submission()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if public.is_board() then
    new.source = 'voc';
    new.status = 'approved';
  else
    new.source = 'lid';
    new.status = 'pending';
  end if;
  return new;
end;
$$;

create trigger activities_normalize_submission
  before insert on public.activities
  for each row execute function public.normalize_activity_submission();

-- Notificeer bestuur/beheer bij een nieuwe, te beoordelen inzending.
create or replace function public.notify_activity_submission()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_submitter_name text;
begin
  if new.status = 'pending' then
    select first_name || ' ' || last_name into v_submitter_name
      from public.profiles where id = new.created_by;

    insert into public.notifications (profile_id, type, title, body, link)
    select id, 'activity_submission', 'Nieuwe activiteit ter goedkeuring',
      coalesce(v_submitter_name, 'Een lid') || ' heeft "' || new.title || '" ingediend.',
      '/agenda/' || new.id
    from public.profiles
    where role in ('bestuurslid', 'beheerder');
  end if;
  return new;
end;
$$;

create trigger activities_notify_submission
  after insert on public.activities
  for each row execute function public.notify_activity_submission();

-- Notificeer de indiener zodra bestuur/beheer een besluit neemt.
create or replace function public.notify_activity_decision()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.created_by is not null
     and new.status in ('approved', 'rejected')
     and old.status = 'pending'
     and new.status is distinct from old.status
  then
    insert into public.notifications (profile_id, type, title, body, link)
    values (
      new.created_by,
      'activity_decision',
      case when new.status = 'approved' then 'Activiteit goedgekeurd' else 'Activiteit afgewezen' end,
      case
        when new.status = 'approved' then 'Je activiteit "' || new.title || '" is goedgekeurd en staat nu in de agenda.'
        else 'Je activiteit "' || new.title || '" is afgewezen.'
      end,
      '/agenda/' || new.id
    );
  end if;
  return new;
end;
$$;

create trigger activities_notify_decision
  after update on public.activities
  for each row execute function public.notify_activity_decision();

-- select: anoniem (WordPress-embed) ziet alleen goedgekeurde VOC-activiteiten;
-- ingelogde leden zien alle goedgekeurde activiteiten (VOC + community), plus
-- hun eigen nog-niet-beoordeelde inzendingen; bestuur/beheer ziet alles.
drop policy "activities_public_select" on public.activities;
create policy "activities_public_select" on public.activities
  for select to anon
  using (source = 'voc' and status = 'approved');

create policy "activities_members_select" on public.activities
  for select to authenticated
  using (status = 'approved' or created_by = auth.uid() or public.is_board());

-- insert: elk actief lid mag indienen — de trigger hierboven bepaalt de
-- daadwerkelijke source/status, dus dit is geen echte escalatie.
drop policy "activities_board_insert" on public.activities;
create policy "activities_insert" on public.activities
  for insert with check (public.is_active_member());

-- delete: bestuur/beheer altijd; een lid mag zijn eigen, nog-niet-beoordeelde
-- inzending intrekken.
create policy "activities_self_delete_pending" on public.activities
  for delete using (created_by = auth.uid() and status = 'pending');
