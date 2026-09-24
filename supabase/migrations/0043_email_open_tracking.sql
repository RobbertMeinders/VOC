-- Fase F: e-mails geopend meten via Resend's eigen Open Tracking + webhook
-- (Svix-signed), i.p.v. een zelfgebouwde tracking-pixel.
--
-- Externe stap (buiten deze migratie, bij Resend zelf): Open Tracking
-- aanzetten op het verzenddomein, een webhook aanmaken naar
-- <site>/api/webhooks/resend voor het event "email.opened", en het
-- signing secret in de omgevingsvariabele RESEND_WEBHOOK_SECRET zetten.

alter table public.notifications
  add column email_provider_id text;

-- Aangeroepen door /api/cron/send-email-notifications direct na een
-- geslaagde verzending (Resend's eigen send-id, nodig om de latere
-- open-webhook aan de juiste rij te koppelen).
create or replace function public.set_notification_email_provider_id(p_notification_id uuid, p_provider_id text)
returns void
language sql
security definer
set search_path = public
as $$
  update public.notifications set email_provider_id = p_provider_id where id = p_notification_id;
$$;

grant execute on function public.set_notification_email_provider_id(uuid, text) to anon, authenticated;

-- Aangeroepen door /api/webhooks/resend bij een email.opened-event — het
-- profiel wordt hier server-side afgeleid uit de bij Resend's send-id
-- horende notificatie, mirror van log_notification_click (0042) voor push.
create or replace function public.log_email_opened(p_provider_id text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_notification_id uuid;
  v_profile_id uuid;
begin
  select id, profile_id into v_notification_id, v_profile_id
    from public.notifications where email_provider_id = p_provider_id;

  if v_notification_id is not null then
    insert into public.events (event_type, profile_id, target_type, target_id, metadata)
    values ('notification_opened', v_profile_id, 'notification', v_notification_id, jsonb_build_object('channel', 'email'));
  end if;
end;
$$;

grant execute on function public.log_email_opened(text) to anon, authenticated;
