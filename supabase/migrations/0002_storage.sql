-- Storage buckets & policies.
-- Every bucket is private: nothing is reachable through a bare public URL.
-- Files are served through Supabase's authenticated storage API or short-
-- lived signed URLs, gated by the same role model as the database tables.
-- Path convention: the first path segment scopes ownership, e.g.
-- avatars/{profile_id}/{file}, company-logos/{company_id}/{file}.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('avatars', 'avatars', false, 5242880, array['image/png', 'image/jpeg', 'image/webp']),
  ('company-logos', 'company-logos', false, 5242880, array['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml']),
  ('feed-media', 'feed-media', false, 15728640, array['image/png', 'image/jpeg', 'image/webp', 'application/pdf']),
  ('documents', 'documents', false, 26214400, array['application/pdf', 'image/png', 'image/jpeg',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'application/msword'])
on conflict (id) do nothing;

-- avatars: any active member can view, owner manages their own folder
create policy "avatars_select" on storage.objects
  for select using (bucket_id = 'avatars' and public.is_active_member());
create policy "avatars_owner_insert" on storage.objects
  for insert with check (
    bucket_id = 'avatars' and public.is_active_member()
    and (storage.foldername(name))[1] = auth.uid()::text
  );
create policy "avatars_owner_update" on storage.objects
  for update using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "avatars_owner_delete" on storage.objects
  for delete using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

-- company-logos: any active member can view; any active member may add one
-- (e.g. when creating a company), only board/admin may replace or remove
create policy "company_logos_select" on storage.objects
  for select using (bucket_id = 'company-logos' and public.is_active_member());
create policy "company_logos_insert" on storage.objects
  for insert with check (bucket_id = 'company-logos' and public.is_active_member());
create policy "company_logos_board_update" on storage.objects
  for update using (bucket_id = 'company-logos' and public.is_board());
create policy "company_logos_board_delete" on storage.objects
  for delete using (bucket_id = 'company-logos' and public.is_board());

-- feed-media: any active member can view and upload their own; author or
-- board/admin can remove
create policy "feed_media_select" on storage.objects
  for select using (bucket_id = 'feed-media' and public.is_active_member());
create policy "feed_media_owner_insert" on storage.objects
  for insert with check (
    bucket_id = 'feed-media' and public.is_active_member()
    and (storage.foldername(name))[1] = auth.uid()::text
  );
create policy "feed_media_owner_or_board_delete" on storage.objects
  for delete using (
    bucket_id = 'feed-media'
    and ((storage.foldername(name))[1] = auth.uid()::text or public.is_board())
  );

-- documents: any active member can view/download, only board/admin manage
create policy "documents_select" on storage.objects
  for select using (bucket_id = 'documents' and public.is_active_member());
create policy "documents_board_insert" on storage.objects
  for insert with check (bucket_id = 'documents' and public.is_board());
create policy "documents_board_update" on storage.objects
  for update using (bucket_id = 'documents' and public.is_board());
create policy "documents_board_delete" on storage.objects
  for delete using (bucket_id = 'documents' and public.is_board());
