-- Fase 3: community feed.
-- The feed_posts/feed_comments/feed_likes/feed_attachments tables and their
-- RLS policies already exist (0001_init.sql). This migration adds:
--   1. A notification when someone comments on your post (not your own).
--      Likes deliberately do NOT notify (spec: avoid notification spam).
--   2. Realtime broadcast for the feed tables, so new posts/comments/likes
--      appear without a page refresh.

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
      '/'
    );
  end if;

  return new;
end;
$$;

create trigger feed_comments_notify_author
  after insert on public.feed_comments
  for each row execute function public.notify_on_feed_comment();

alter publication supabase_realtime add table
  public.feed_posts,
  public.feed_comments,
  public.feed_likes,
  public.feed_attachments;
