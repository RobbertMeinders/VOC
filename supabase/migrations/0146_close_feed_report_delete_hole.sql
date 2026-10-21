-- Beveiligingsfixlijst Blok 2, M11: feed_post_reports_author_or_board_delete
-- (0073) stond ook de auteur van het GERAPPORTEERDE bericht toe om een
-- report-rij op dat bericht te verwijderen — oorspronkelijk alleen bedoeld
-- om de ON DELETE CASCADE-keten te ontgrendelen wanneer iemand zijn eigen
-- (gerapporteerde) bericht verwijdert, maar RLS kan een cascade-delete niet
-- onderscheiden van een losse, rechtstreekse DELETE op precies die ene
-- report-rij — die auteur kon zo een tegen zichzelf lopende melding
-- stilletjes laten verdwijnen vóórdat bestuur/beheer 'm ooit ziet, buiten
-- elke moderatieflow om.
--
-- Niets in de app verwijdert een report-rij ooit los (bestuur handelt af
-- via status='afgehandeld', zie beheer/rapportages/actions.ts) — de enige
-- legitieme DELETE is de cascade bij het verwijderen van het bericht zelf.
-- Die gaat voortaan via onderstaande SECURITY DEFINER-functie (bypasst RLS
-- op de cascade, net als elders in deze migratiegeschiedenis), i.p.v. via
-- een brede RLS-regel die ook losse deletes toestaat.
drop policy "feed_post_reports_author_or_board_delete" on public.feed_post_reports;

create policy "feed_post_reports_board_delete" on public.feed_post_reports
  for delete using (public.is_board());

create or replace function public.delete_feed_post(p_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (
    select 1 from public.feed_posts
    where id = p_id and (author_id = auth.uid() or public.is_board())
  ) then
    raise exception 'not authorized';
  end if;

  delete from public.feed_posts where id = p_id;
end;
$$;

grant execute on function public.delete_feed_post(uuid) to authenticated;
