-- Feed: @mentions of members and companies in posts/comments.
-- The composer inserts mentions as "@[Naam](profiel:<uuid>)" or
-- "@[Naam](bedrijf:<uuid>)" into the plain-text content; the client renders
-- these as links. This migration parses that syntax server-side and
-- notifies the mentioned member (or, for a company mention, every active
-- member of that company), so a client can never forge a notification by
-- crafting mention syntax that doesn't match a real match in `content`.

create or replace function public.dispatch_mention_notifications(
  p_content text,
  p_author_id uuid,
  p_context text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_author_name text;
  v_match text[];
  v_profile_ids uuid[] := '{}';
  v_company_ids uuid[] := '{}';
  v_target_ids uuid[];
begin
  if p_content is null then
    return;
  end if;

  for v_match in
    select regexp_matches(p_content, '@\[[^\]]+\]\((profiel|bedrijf):([0-9a-fA-F-]{36})\)', 'g')
  loop
    if v_match[1] = 'profiel' then
      v_profile_ids := array_append(v_profile_ids, v_match[2]::uuid);
    else
      v_company_ids := array_append(v_company_ids, v_match[2]::uuid);
    end if;
  end loop;

  if array_length(v_profile_ids, 1) is null and array_length(v_company_ids, 1) is null then
    return;
  end if;

  select first_name || ' ' || last_name into v_author_name
    from public.profiles where id = p_author_id;

  select array_agg(distinct target) into v_target_ids
  from (
    select p.id as target
    from public.profiles p
    where p.id = any(v_profile_ids) and p.is_active and p.id <> p_author_id

    union

    select cm.profile_id as target
    from public.company_members cm
    join public.profiles p on p.id = cm.profile_id
    where cm.company_id = any(v_company_ids) and p.is_active and cm.profile_id <> p_author_id
  ) t;

  if v_target_ids is null then
    return;
  end if;

  insert into public.notifications (profile_id, type, title, body, link)
  select target, 'feed_mention', 'Je bent genoemd in de feed',
    coalesce(v_author_name, 'Iemand') || ' heeft je genoemd in ' || p_context || '.',
    '/'
  from unnest(v_target_ids) as target;
end;
$$;

create or replace function public.notify_feed_post_mentions()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.dispatch_mention_notifications(new.content, new.author_id, 'een bericht');
  return new;
end;
$$;

create trigger feed_posts_notify_mentions
  after insert on public.feed_posts
  for each row execute function public.notify_feed_post_mentions();

create or replace function public.notify_feed_comment_mentions()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.dispatch_mention_notifications(new.content, new.author_id, 'een reactie');
  return new;
end;
$$;

create trigger feed_comments_notify_mentions
  after insert on public.feed_comments
  for each row execute function public.notify_feed_comment_mentions();
