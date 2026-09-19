-- Admins get full edit rights over member content, matching their existing
-- full authority over profiles (profiles_admin_update, 0001_init.sql) and
-- companies (companies_board_update). This is an additional permissive
-- policy alongside feed_posts_self_update, so either the author or an admin
-- may update a post's content.
create policy "feed_posts_admin_update" on public.feed_posts
  for update using (public.is_admin())
  with check (public.is_admin());

-- An admin editing another member's profile also needs to be able to
-- replace that member's avatar — the existing avatars_owner_* policies only
-- allow a member to manage their own folder.
drop policy if exists "avatars_owner_insert" on storage.objects;
create policy "avatars_owner_or_admin_insert" on storage.objects
  for insert with check (
    bucket_id = 'avatars' and public.is_active_member()
    and ((storage.foldername(name))[1] = auth.uid()::text or public.is_admin())
  );

drop policy if exists "avatars_owner_update" on storage.objects;
create policy "avatars_owner_or_admin_update" on storage.objects
  for update using (
    bucket_id = 'avatars'
    and ((storage.foldername(name))[1] = auth.uid()::text or public.is_admin())
  );
