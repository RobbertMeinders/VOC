-- F1: updateMyCompanyAction (profiel/actions.ts) verwijderde de bestaande
-- company_members-koppeling van een lid VOORDAT de vervanging daadwerkelijk
-- vaststond — bij een nieuw bedrijf kon een onverwachte fout tussen het
-- verwijderen en het opnieuw koppelen een lid zonder enig bedrijf achterlaten,
-- en bij een bestaand bedrijf (dat nog goedkeuring nodig heeft) verdween de
-- koppeling zelfs al tijdens het wachten op die goedkeuring. De actie
-- verwijdert de oude koppeling nu pas ná een bevestigde nieuwe insert (nieuw
-- bedrijf), of helemaal niet meer zelf (bestaand bedrijf) — hieronder ruimt
-- handle_company_membership_decision (0013) de oude koppeling(en) op in
-- hetzelfde moment als de nieuwe bij goedkeuring wordt gelegd.
create or replace function public.handle_company_membership_decision()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status = 'approved' and old.status is distinct from 'approved' then
    delete from public.company_members
    where profile_id = new.profile_id and company_id <> new.company_id;

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
        else 'Je aanvraag om aan dit bedrijf gekoppeld te worden is afgewezen.'
      end,
      '/bedrijven/' || new.company_id
    );
  end if;

  return new;
end;
$$;
