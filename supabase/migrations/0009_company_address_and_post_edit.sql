-- Bezoekersadres op het bedrijfsprofiel.
alter table public.companies
  add column address text,
  add column postal_code text;

-- Members can now edit their own feed posts (content only — attachments stay
-- fixed once posted). Board/admin moderate via the existing delete policy,
-- not edit: rewriting someone else's words isn't moderation.
create policy "feed_posts_self_update" on public.feed_posts
  for update using (author_id = auth.uid())
  with check (author_id = auth.uid());
