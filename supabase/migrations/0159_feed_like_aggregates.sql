-- Portaal-gezondheid Blok C: de feed-lijst (fetchFeedPosts/fetchFeedPostsByAuthor,
-- src/lib/feed/queries.ts) haalde tot nu toe élke like-rij op mét een
-- geneste profiles-join, puur om een totaalaantal te tonen en de naam van
-- de meest recente liker — op een druk bericht met honderden likes dus
-- honderden overbodige profile-rijen per paginalading. Deze twee functies
-- doen de telling en de "wie is de meest recente liker"-bepaling in SQL,
-- in één aggregatie per pagina i.p.v. per like-rij in de applicatielaag.
--
-- security invoker (geen "security definer"): feed_likes_members_select/
-- feed_comment_likes_members_select (0001_init.sql, 0027_comment_likes.sql)
-- staan elk actief lid al toe om alle rijen te lezen, dus deze functies
-- hoeven geen eigen rechten-bypass — ze draaien gewoon met de rechten van
-- de aanroeper en respecteren dezelfde RLS als de rechtstreekse selects die
-- ze vervangen.
create or replace function public.get_feed_post_like_summaries(p_post_ids uuid[])
returns table (
  post_id uuid,
  likes_count bigint,
  top_liker_first_name text,
  top_liker_last_name text
)
language sql
stable
as $$
  select
    fl.post_id,
    count(*) as likes_count,
    (array_agg(p.first_name order by fl.created_at desc))[1] as top_liker_first_name,
    (array_agg(p.last_name order by fl.created_at desc))[1] as top_liker_last_name
  from public.feed_likes fl
  join public.profiles p on p.id = fl.profile_id
  where fl.post_id = any (p_post_ids)
  group by fl.post_id;
$$;

grant execute on function public.get_feed_post_like_summaries(uuid[]) to authenticated;

create or replace function public.get_feed_comment_like_counts(p_comment_ids uuid[])
returns table (
  comment_id uuid,
  likes_count bigint
)
language sql
stable
as $$
  select fcl.comment_id, count(*) as likes_count
  from public.feed_comment_likes fcl
  where fcl.comment_id = any (p_comment_ids)
  group by fcl.comment_id;
$$;

grant execute on function public.get_feed_comment_like_counts(uuid[]) to authenticated;
