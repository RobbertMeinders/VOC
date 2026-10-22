-- B3: twee kant-en-klare samengestelde doelgroepen naast "Alle actieve
-- leden" en "Specifieke lijst(en)" -- "Iedereen" (alle actieve leden +
-- alle contacten) en "Niet-leden" (alleen de contacten). Bewust geen nieuwe
-- lijst-rijen (contact_lists/contact_list_*) die handmatig bijgehouden
-- moeten worden: beide volgen rechtstreeks uit profiles/contacts zelf, dus
-- nooit verouderd en zonder enig onderhoud. Afgemelde/inactieve ontvangers
-- krijgen via claim_newsletter_deliveries hieronder nog steeds meteen status
-- 'overgeslagen' i.p.v. gewoon te worden weggelaten, zoals bij elk ander
-- filter.

alter table public.communications
  drop constraint communications_recipient_filter_check;
alter table public.communications
  add constraint communications_recipient_filter_check
  check (recipient_filter in ('alle_actieve_leden', 'lijsten', 'iedereen', 'niet_leden'));

create or replace function public.claim_newsletter_deliveries(p_communication_id uuid, p_kind text)
returns table (delivery_id uuid, profile_id uuid, contact_id uuid, email text, attempt_id uuid)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_filter text;
  v_attempt_id uuid;
begin
  if not (public.is_board() or auth.role() = 'service_role') then
    raise exception 'not authorized';
  end if;
  if p_kind not in ('eerste_verzending', 'nasturen', 'opnieuw_proberen') then
    raise exception 'ongeldig soort verzendpoging: %', p_kind;
  end if;

  select recipient_filter into v_filter from public.communications where id = p_communication_id;
  if v_filter is null then
    raise exception 'nieuwsbrief niet gevonden';
  end if;

  insert into public.communication_send_attempts (communication_id, kind, started_by)
  values (p_communication_id, p_kind, auth.uid())
  returning id into v_attempt_id;

  insert into public.communication_deliveries (communication_id, profile_id, email, status, failure_reason)
  select
    p_communication_id,
    p.id,
    lower(trim(p.email)),
    case when p.email_campaigns then 'wachten' else 'overgeslagen' end,
    case when p.email_campaigns then null else 'afgemeld' end
  from public.profiles p
  where p.is_active
    and (
      v_filter in ('alle_actieve_leden', 'iedereen')
      or exists (
        select 1 from public.communication_recipient_lists crl
        join public.contact_list_profiles clp on clp.list_id = crl.list_id
        where crl.communication_id = p_communication_id and clp.profile_id = p.id
      )
      or exists (
        select 1 from public.communication_recipient_profiles crp
        where crp.communication_id = p_communication_id and crp.profile_id = p.id
      )
    )
  on conflict (communication_id, email) do nothing;

  insert into public.communication_deliveries (communication_id, contact_id, email, status, failure_reason)
  select
    p_communication_id,
    ct.id,
    lower(trim(ct.email)),
    case when ct.opted_out then 'overgeslagen' else 'wachten' end,
    case when ct.opted_out then 'afgemeld' else null end
  from public.contacts ct
  where (
      v_filter = 'lijsten' and exists (
        select 1 from public.communication_recipient_lists crl
        join public.contact_list_contacts clc on clc.list_id = crl.list_id
        where crl.communication_id = p_communication_id and clc.contact_id = ct.id
      )
    )
    or v_filter in ('iedereen', 'niet_leden')
    or exists (
      select 1 from public.communication_recipient_contacts crc
      where crc.communication_id = p_communication_id and crc.contact_id = ct.id
    )
  on conflict (communication_id, email) do nothing;

  update public.communications
  set total_recipients = (select count(*) from public.communication_deliveries where communication_id = p_communication_id)
  where id = p_communication_id;

  update public.communication_deliveries
  set attempt_id = v_attempt_id, status = 'wachten', failure_reason = null
  where communication_id = p_communication_id
    and status in ('wachten', 'mislukt');

  return query
  select d.id, d.profile_id, d.contact_id, d.email, d.attempt_id
  from public.communication_deliveries d
  where d.communication_id = p_communication_id
    and d.attempt_id = v_attempt_id
    and d.status = 'wachten';
end;
$$;

revoke execute on function public.claim_newsletter_deliveries(uuid, text) from public, anon;
grant execute on function public.claim_newsletter_deliveries(uuid, text) to authenticated, service_role;

insert into public.schema_migration_log (version) values ('0192') on conflict (version) do nothing;
notify pgrst, 'reload schema';
