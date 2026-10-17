-- Performance-audit (D10, "bijvangst"): bestuur/beheer kon notifications
-- alleen voor zichzelf lezen (notifications_self_select, 0001_init.sql),
-- niet voor alle leden. Statistieken (src/lib/statistics/queries.ts),
-- Verzendlog (beheer/notificaties) en de campagnedetailpagina
-- (beheer/communicatie/[id]) gebruiken allemaal de gewone, RLS-gebonden
-- client om notifications te lezen — zonder deze policy kreeg een
-- bestuurslid daar dus alleen zijn/haar eigen meldingen terug, geen fout,
-- gewoon stilletjes onvolledige cijfers. Permissive policies worden OR'd,
-- dus dit voegt toe aan (vervangt niet) notifications_self_select.
create policy "notifications_board_select" on public.notifications
  for select using (public.is_board());
