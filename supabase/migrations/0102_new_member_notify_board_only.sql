-- Communicatieplan fase 1d: de in-app "Nieuw lid"-melding ging tot nu toe
-- naar élk actief lid (zie 0019_broadcast_notifications.sql) — push en
-- e-mail staan voor dit type al hardgecodeerd uit (0079_notification_
-- channel_rules.sql), maar de in-app-fanout zelf ging nog gewoon naar
-- iedereen. Bij meerdere registraties kort na elkaar (bv. rond de livegang)
-- gaf dat voor elk nieuw lid een extra melding aan de hele ledenlijst.
-- Alleen bestuur/beheer heeft hier daadwerkelijk iets mee te doen (dezelfde
-- doelgroep als bv. notify_access_request), dus die beperking hier ook.
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
    where is_active and role in ('bestuurslid', 'beheerder') and id <> new.id;
  end if;
  return new;
end;
$$;
