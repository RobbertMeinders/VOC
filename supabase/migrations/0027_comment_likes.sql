-- Reacties (comments) krijgen dezelfde like-functionaliteit als berichten
-- zelf — spiegelt feed_likes 1-op-1 (zelfde kolommen, zelfde RLS-vorm).
create table if not exists public.feed_comment_likes (
  id uuid primary key default gen_random_uuid(),
  comment_id uuid not null references public.feed_comments (id) on delete cascade,
  profile_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (comment_id, profile_id)
);

create index if not exists feed_comment_likes_comment_idx on public.feed_comment_likes (comment_id);

alter table public.feed_comment_likes enable row level security;

drop policy if exists "feed_comment_likes_members_select" on public.feed_comment_likes;
create policy "feed_comment_likes_members_select" on public.feed_comment_likes
  for select using (public.is_active_member());

drop policy if exists "feed_comment_likes_self_insert" on public.feed_comment_likes;
create policy "feed_comment_likes_self_insert" on public.feed_comment_likes
  for insert with check (profile_id = auth.uid() and public.is_active_member());

drop policy if exists "feed_comment_likes_self_delete" on public.feed_comment_likes;
create policy "feed_comment_likes_self_delete" on public.feed_comment_likes
  for delete using (profile_id = auth.uid());

alter publication supabase_realtime add table public.feed_comment_likes;

-- Reacties konden nog niet bewerkt worden (alleen select/insert/delete-
-- policies bestonden) — zelfde vorm als feed_posts_self_update /
-- feed_posts_admin_update.
drop policy if exists "feed_comments_self_update" on public.feed_comments;
create policy "feed_comments_self_update" on public.feed_comments
  for update using (author_id = auth.uid())
  with check (author_id = auth.uid());

drop policy if exists "feed_comments_admin_update" on public.feed_comments;
create policy "feed_comments_admin_update" on public.feed_comments
  for update using (public.is_admin())
  with check (public.is_admin());

-- Notificatie bij een reactie linkte altijd naar de home page ('/'), die
-- sinds de dashboard-vereenvoudiging geen feed meer toont. Linkt nu naar de
-- community-pagina met een anchor naar de reactie zelf, zodat je er direct
-- naartoe springt (zie CommunityPage/FeedList, die ?highlight=<comment_id>
-- leest en naar dat element scrollt).
create or replace function public.notify_on_feed_comment()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_post_author uuid;
  v_commenter_name text;
begin
  select author_id into v_post_author from public.feed_posts where id = new.post_id;

  if v_post_author is not null and v_post_author <> new.author_id then
    select first_name || ' ' || last_name into v_commenter_name
      from public.profiles where id = new.author_id;

    insert into public.notifications (profile_id, type, title, body, link)
    values (
      v_post_author,
      'feed_comment',
      'Nieuwe reactie op je bericht',
      coalesce(v_commenter_name, 'Iemand') || ' heeft gereageerd op je bericht.',
      '/community?highlight=' || new.id
    );
  end if;

  return new;
end;
$$;
