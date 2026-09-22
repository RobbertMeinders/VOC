-- Afwijzen van een ingebrachte activiteit gaf de indiener geen enkele
-- toelichting waarom — voegt een reden toe die het bestuur invult en die de
-- indiener terugziet in zijn/haar notificatie.
alter table public.activities add column rejection_reason text;

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
        when new.rejection_reason is not null and new.rejection_reason <> ''
          then 'Je activiteit "' || new.title || '" is afgewezen: ' || new.rejection_reason
        else 'Je activiteit "' || new.title || '" is afgewezen.'
      end,
      '/agenda/' || new.id
    );
  end if;
  return new;
end;
$$;
