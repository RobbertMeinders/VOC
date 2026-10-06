-- Bug: berichten en reacties in de Community konden niet verwijderd worden
-- zodra er iemand anders dan de eigenaar op had gereageerd/geliked, of het
-- bericht gerapporteerd was. feed_posts/feed_comments laten delete toe aan
-- de eigenaar of bestuur (0001_init.sql), maar de on-delete-cascade naar
-- feed_likes/feed_comment_likes/feed_post_reports wordt door Postgres nog
-- steeds via RLS gecheckt — en die policies stonden alleen de liker zelf
-- toe (likes), of hadden helemaal geen delete-policy (reports, dus RLS
-- weigert iedereen inclusief bestuur). Daardoor faalde de hele DELETE op
-- feed_posts/feed_comments met een permission-denied van Postgres, die de
-- server action nergens opving (zie src/app/(app)/actions.ts) — de UI
-- verwijderde het bericht/reactie toch al optimistisch uit de lokale state,
-- dus het leek te werken totdat je de pagina verversde.

drop policy "feed_likes_self_delete" on public.feed_likes;
create policy "feed_likes_self_delete" on public.feed_likes
  for delete using (
    profile_id = auth.uid()
    or public.is_board()
    or exists (select 1 from public.feed_posts where id = post_id and author_id = auth.uid())
  );

drop policy "feed_comment_likes_self_delete" on public.feed_comment_likes;
create policy "feed_comment_likes_self_delete" on public.feed_comment_likes
  for delete using (
    profile_id = auth.uid()
    or public.is_board()
    or exists (select 1 from public.feed_comments where id = comment_id and author_id = auth.uid())
  );

create policy "feed_post_reports_author_or_board_delete" on public.feed_post_reports
  for delete using (
    public.is_board()
    or exists (select 1 from public.feed_posts where id = post_id and author_id = auth.uid())
  );
