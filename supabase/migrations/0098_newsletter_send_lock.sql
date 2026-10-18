-- F3: performNewsletterSend kon twee keer tegelijk op dezelfde communication
-- draaien (handmatig op "Versturen" klikken terwijl de cron voor een
-- ingeplande verzending net ook afgaat, of twee snelle kliks achter elkaar)
-- — claim_newsletter_recipients voegt alleen nieuwe ontvangers toe en geeft
-- gewoon elke nog-niet-verstuurde rij terug, zonder iets te reserveren, dus
-- beide aanroepen kregen dezelfde ontvangers en stuurden allebei een mail
-- vóór emailed_at ergens gezet werd. Nieuwe transiënte status 'versturen'
-- plus een atomaire claim-RPC lost dat op: wie de rij niet als eerste van
-- 'concept'/'ingepland'/'verzenden_mislukt' naar 'versturen' kan zetten,
-- stopt meteen zonder iets te versturen. De 10-minuten-stale-uitzondering
-- voorkomt dat een communication na een afgebroken (bv. function-timeout)
-- poging voorgoed op 'versturen' blijft steken.
alter table public.communications drop constraint communications_status_check;
alter table public.communications add constraint communications_status_check
  check (status in ('concept', 'verzonden', 'verzenden_mislukt', 'ingepland', 'versturen'));

create or replace function public.claim_newsletter_send(p_communication_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_rows integer;
begin
  if not (public.is_board() or auth.role() = 'service_role') then
    raise exception 'not authorized';
  end if;

  update public.communications
  set status = 'versturen'
  where id = p_communication_id
    and (
      status in ('concept', 'ingepland', 'verzenden_mislukt')
      or (status = 'versturen' and updated_at < now() - interval '10 minutes')
    );
  get diagnostics v_rows = row_count;
  return v_rows > 0;
end;
$$;

grant execute on function public.claim_newsletter_send(uuid) to authenticated, service_role;
