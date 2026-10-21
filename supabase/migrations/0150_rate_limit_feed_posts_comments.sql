-- Beveiligingsfixlijst Blok 3, Laag: feed_posts/feed_comments hadden geen
-- enkele grens op hoe vaak eenzelfde account mag posten/reageren — een
-- gecompromitteerd of geautomatiseerd account kon de Community zo
-- ongelimiteerd vollplempen. Zelfde patroon als enforce_access_request_
-- rate_limit (0120)/enforce_testfase_feedback_rate_limit (0124): een
-- BEFORE INSERT-trigger, want een check die alleen in de server action zit
-- is te omzeilen door rechtstreeks tegen Supabase's REST-API te posten.
create or replace function public.enforce_feed_post_rate_limit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_recent_count integer;
begin
  select count(*) into v_recent_count
    from public.feed_posts
    where author_id = new.author_id
      and created_at > now() - interval '15 minutes';

  if v_recent_count >= 10 then
    raise exception 'Je hebt de afgelopen tijd al genoeg berichten geplaatst. Probeer het later opnieuw.';
  end if;

  return new;
end;
$$;

create trigger feed_posts_rate_limit
  before insert on public.feed_posts
  for each row execute function public.enforce_feed_post_rate_limit();

create or replace function public.enforce_feed_comment_rate_limit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_recent_count integer;
begin
  select count(*) into v_recent_count
    from public.feed_comments
    where author_id = new.author_id
      and created_at > now() - interval '15 minutes';

  if v_recent_count >= 20 then
    raise exception 'Je hebt de afgelopen tijd al genoeg reacties geplaatst. Probeer het later opnieuw.';
  end if;

  return new;
end;
$$;

create trigger feed_comments_rate_limit
  before insert on public.feed_comments
  for each row execute function public.enforce_feed_comment_rate_limit();
