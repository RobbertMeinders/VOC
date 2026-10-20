-- Koppelverzoeken onder Aanvragen (zie Beheer -> Aanvragen -> Bedrijfskoppelingen):
-- afwijzen kan nu een optionele reden meekrijgen, zichtbaar in de
-- "Afgehandeld"-geschiedenis.
alter table public.company_membership_requests add column decision_reason text;

create or replace function public.handle_company_membership_decision()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status = 'approved' and old.status is distinct from 'approved' then
    insert into public.company_members (company_id, profile_id)
    values (new.company_id, new.profile_id)
    on conflict do nothing;
  end if;

  if new.status in ('approved', 'rejected') and old.status is distinct from new.status then
    new.decided_at = now();

    insert into public.notifications (profile_id, type, title, body, link)
    values (
      new.profile_id,
      'company_membership_decision',
      case when new.status = 'approved' then 'Bedrijfskoppeling goedgekeurd' else 'Bedrijfskoppeling afgewezen' end,
      case
        when new.status = 'approved' then 'Je aanvraag om aan dit bedrijf gekoppeld te worden is goedgekeurd.'
        when new.decision_reason is not null and new.decision_reason <> ''
          then 'Je aanvraag om aan dit bedrijf gekoppeld te worden is afgewezen. Reden: ' || new.decision_reason
        else 'Je aanvraag om aan dit bedrijf gekoppeld te worden is afgewezen.'
      end,
      '/bedrijven/' || new.company_id
    );
  end if;

  return new;
end;
$$;
