-- company_logos_insert stond open voor elk actief lid (public.is_active_member()),
-- zonder enige ownership-check — anders dan avatars_owner_insert/
-- feed_media_owner_insert, die het eerste padsegment aan auth.uid() koppelen.
-- Een lid kon zo rechtstreeks via de Supabase-client (buiten updateCompanyAction
-- om, die al wél requireBoard() afdwingt) een bestand wegschrijven in de
-- logo-map van ELK bedrijf, niet alleen het eigen bedrijf. In de app zelf
-- uploadt alleen een bestuurslid/beheerder ooit een bedrijfslogo (zie
-- updateCompanyAction in src/app/(app)/bedrijven/[id]/actions.ts), dus deze
-- policy scopen naar is_board() verandert niets aan bestaand gedrag.
drop policy if exists "company_logos_insert" on storage.objects;
create policy "company_logos_board_insert" on storage.objects
  for insert with check (bucket_id = 'company-logos' and public.is_board());
