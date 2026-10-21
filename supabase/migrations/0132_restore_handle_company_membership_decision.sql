-- Portaal-gezondheidsonderzoek, Blok A1+A2 (overlapt met beveiligingsfix M7):
-- 0127 herschreef handle_company_membership_decision() vanuit de 0013-versie
-- van vóór 0097 en 0105, en liet daarmee twee eerdere fixes ongemerkt
-- terugvallen:
--   1. (0097) het verwijderen van de oude company_members-koppeling(en) bij
--      goedkeuring voor een ANDER bedrijf — zonder die delete blijft een lid
--      dat overstapt aan BEIDE bedrijven gekoppeld (dubbele bewerkrechten,
--      "wisselen bij goedkeuring" werkt niet meer).
--   2. (0105) de notification_dispatch_config-gating en de
--      channel_*_allowed-kolommen — zonder die gating/kolommen heeft het
--      uitzetten van het type/kanaal "Bedrijfskoppeling beoordeeld" in
--      Notificatieregels geen effect meer (notifications.channel_*_allowed
--      viel terug op de kolom-default, altijd true).
-- Deze versie combineert 0097 + 0105 weer, met behoud van 0127's
-- decision_reason in de afwijstekst.
create or replace function public.handle_company_membership_decision()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_cfg record;
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

    select * into v_cfg from public.notification_dispatch_config('company_membership_decision');
    if v_cfg.enabled then
      insert into public.notifications (profile_id, type, title, body, link, channel_push_allowed, channel_email_allowed, channel_inapp_allowed)
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
        '/bedrijven/' || new.company_id,
        v_cfg.channel_push, v_cfg.channel_email, v_cfg.channel_inapp
      );
    end if;
  end if;

  return new;
end;
$$;
