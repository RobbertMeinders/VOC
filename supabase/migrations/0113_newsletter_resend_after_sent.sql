-- N3 (D6, nieuwsbriefsysteem-plan): claim_newsletter_send (0098) liet een
-- nieuwe verzendpoging alleen starten vanuit 'concept', 'ingepland' of
-- 'verzenden_mislukt' (of een >10 minuten oude, vastgelopen 'versturen') —
-- nooit vanuit 'verzonden'. Dat blokkeerde "nasturen" naar een later
-- toegevoegde ontvanger (bv. een nieuw lid) op een al volledig verzonden
-- nieuwsbrief: de server weigerde met "al volledig verzonden", ook al voegt
-- claim_newsletter_recipients/_contact_recipients alleen écht nieuwe,
-- nog-niet-verstuurde ontvangers toe en slaat iedereen die al iets ontving
-- vanzelf over. 'verzonden' is hier dus een even geldige startstatus als de
-- andere drie: finalize_newsletter_send (0089) zet de status na afloop
-- hoe dan ook weer terug op basis van wat er écht verstuurd is.
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
      status in ('concept', 'ingepland', 'verzenden_mislukt', 'verzonden')
      or (status = 'versturen' and updated_at < now() - interval '10 minutes')
    );
  get diagnostics v_rows = row_count;
  return v_rows > 0;
end;
$$;

grant execute on function public.claim_newsletter_send(uuid) to authenticated, service_role;
