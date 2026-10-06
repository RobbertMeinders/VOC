-- Campagnes kunnen voortaan voor een later moment ingepland worden i.p.v.
-- alleen direct versturen. Een nieuwe status 'ingepland' (naast de
-- bestaande concept/verzonden/verzenden_mislukt) plus het moment waarop de
-- cron 'm moet oppakken.
alter table public.communications add column scheduled_at timestamptz;

alter table public.communications drop constraint communications_status_check;
alter table public.communications add constraint communications_status_check
  check (status in ('concept', 'verzonden', 'verzenden_mislukt', 'ingepland'));

-- Alleen de ingeplande rijen zijn relevant voor de cron-lookup hieronder —
-- een partial index i.p.v. de bestaande (status, created_at desc) index,
-- die voor deze query niet selectief genoeg is.
create index communications_scheduled_idx on public.communications (scheduled_at) where status = 'ingepland';

-- De drie verzend-RPC's (0067) checkten tot nu toe alleen is_board(), wat
-- een ingelogde sessie van een bestuurslid vereist — prima voor de
-- "Versturen"-knop, maar de nieuwe cron (/api/cron/send-scheduled-campaigns)
-- heeft geen sessie en roept ze aan via de service-role client. auth.role()
-- = 'service_role' is daarvoor de standaard Supabase-check (zelfde manier
-- waarop PostgREST/de admin-client zich identificeert), dus is_board() OF
-- service_role mag nu allebei door — elke andere ingelogde gebruiker nog
-- steeds niet.
create or replace function public.claim_newsletter_recipients(p_communication_id uuid)
returns table (notification_id uuid, profile_id uuid, email text)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not (public.is_board() or auth.role() = 'service_role') then
    raise exception 'not authorized';
  end if;

  insert into public.notifications (profile_id, type, title, communication_id, channel_push_allowed, channel_email_allowed)
  select p.id, 'newsletter', c.subject, c.id, false, false
  from public.profiles p
  cross join public.communications c
  where c.id = p_communication_id
    and p.is_active
  on conflict (communication_id, profile_id) where communication_id is not null do nothing;

  update public.communications
  set total_recipients = (select count(*) from public.notifications where communication_id = p_communication_id)
  where id = p_communication_id and total_recipients is null;

  return query
  select n.id, n.profile_id, p.email
  from public.notifications n
  join public.profiles p on p.id = n.profile_id
  where n.communication_id = p_communication_id
    and n.emailed_at is null;
end;
$$;

grant execute on function public.claim_newsletter_recipients(uuid) to service_role;

create or replace function public.mark_newsletter_notification_sent(p_notification_id uuid, p_provider_id text default null)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not (public.is_board() or auth.role() = 'service_role') then
    raise exception 'not authorized';
  end if;

  update public.notifications
  set emailed_at = now(), email_provider_id = p_provider_id
  where id = p_notification_id and communication_id is not null;
end;
$$;

grant execute on function public.mark_newsletter_notification_sent(uuid, text) to service_role;

create or replace function public.finalize_newsletter_send(p_communication_id uuid)
returns table (total integer, sent integer)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_total integer;
  v_sent integer;
begin
  if not (public.is_board() or auth.role() = 'service_role') then
    raise exception 'not authorized';
  end if;

  select count(*), count(*) filter (where emailed_at is not null)
  into v_total, v_sent
  from public.notifications
  where communication_id = p_communication_id;

  update public.communications
  set status = case when v_total > 0 and v_sent >= v_total then 'verzonden' else 'verzenden_mislukt' end,
      sent_at = case when v_total > 0 and v_sent >= v_total and sent_at is null then now() else sent_at end
  where id = p_communication_id;

  return query select v_total, v_sent;
end;
$$;

grant execute on function public.finalize_newsletter_send(uuid) to service_role;
