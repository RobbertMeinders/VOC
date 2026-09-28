-- Afbeelding (logo/handtekening) in een e-mailtemplate. Elke bestaande
-- bucket is bewust privé (zie 0002_storage.sql) — maar een e-mail wordt
-- door de ontvanger gelezen buiten de app om, zonder Supabase-sessie, dus
-- een private bucket/signed URL (die bovendien verloopt) werkt hier niet.
-- Deze bucket is daarom bewust wél publiek: een logo dat toch al naar elke
-- ontvanger van de mail gaat, is per definitie niet geheim. Geen SVG
-- (inconsistente ondersteuning in e-mailclients zoals Outlook).
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('email-assets', 'email-assets', true, 5242880, array['image/png', 'image/jpeg', 'image/webp'])
on conflict (id) do nothing;

-- Alleen bestuur/beheer mag hier iets in zetten/wijzigen/verwijderen; lezen
-- gaat via de publieke bucket-URL en heeft geen RLS-select-policy nodig
-- (dat is precies het punt van een publieke bucket).
create policy "email_assets_board_insert" on storage.objects
  for insert with check (bucket_id = 'email-assets' and public.is_board());
create policy "email_assets_board_update" on storage.objects
  for update using (bucket_id = 'email-assets' and public.is_board());
create policy "email_assets_board_delete" on storage.objects
  for delete using (bucket_id = 'email-assets' and public.is_board());
