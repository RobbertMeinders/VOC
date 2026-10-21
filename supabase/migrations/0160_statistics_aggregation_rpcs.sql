-- Foutenrapport-statistieken M12/M13: een aantal queries op de
-- statistiekenpagina haalden alle rijen van een groeiende tabel naar de
-- client om daar te tellen/groeperen (events, feed_comments,
-- communication_deliveries, activity_registrations) — met echte
-- ledenaantallen kan dat ver boven de standaard PostgREST-rijlimiet van
-- 1000 uitkomen, en elke keer de volledige tabel overhalen kost nodeloos
-- tijd (gemeten laadtijden tot 22s). Deze functies groeperen/tellen in SQL
-- i.p.v. in JavaScript. Allemaal met dezelfde autorisatiegrens als de
-- pagina die ze voedt: alleen bestuur/beheer (public.is_board()) krijgt
-- rijen terug, net als de RLS op deze onderliggende tabellen al afdwingt
-- voor andere toegangspaden.

create function public.get_post_view_counts()
returns table (post_id uuid, views bigint)
language sql
stable
security definer
set search_path = public
as $$
  select target_id, count(*)
  from public.events
  where event_type = 'post_viewed' and target_id is not null and public.is_board()
  group by target_id;
$$;

grant execute on function public.get_post_view_counts() to authenticated;

create function public.get_feed_comment_counts()
returns table (post_id uuid, comment_count bigint)
language sql
stable
security definer
set search_path = public
as $$
  select post_id, count(*)
  from public.feed_comments
  where public.is_board()
  group by post_id;
$$;

grant execute on function public.get_feed_comment_counts() to authenticated;

create function public.get_communication_delivery_stats()
returns table (communication_id uuid, sent bigint, failed bigint, total bigint)
language sql
stable
security definer
set search_path = public
as $$
  select
    communication_id,
    count(*) filter (where status = 'verstuurd'),
    count(*) filter (where status = 'mislukt'),
    count(*)
  from public.communication_deliveries
  where public.is_board()
  group by communication_id;
$$;

grant execute on function public.get_communication_delivery_stats() to authenticated;

-- Vervangt een rechtstreekse select op alle activity_registrations van de
-- laatste 12 maanden (activities.ts) door een per-profiel-telling
-- (exclusief wachtlijst) — gebruikt voor zowel "Wie komt er?" als het
-- signaal "Nooit naar een activiteit", die voorheen elk hun eigen,
-- onderling afwijkende definitie hadden (foutenrapport M4).
create function public.get_registration_counts_by_profile(p_since timestamptz)
returns table (profile_id uuid, registrations bigint)
language sql
stable
security definer
set search_path = public
as $$
  select profile_id, count(*)
  from public.activity_registrations
  where is_waitlisted = false
    and created_at >= p_since
    and profile_id is not null
    and public.is_board()
  group by profile_id;
$$;

grant execute on function public.get_registration_counts_by_profile(timestamptz) to authenticated;

create function public.get_notification_type_counts(p_start timestamptz, p_end timestamptz)
returns table (type text, cnt bigint)
language sql
stable
security definer
set search_path = public
as $$
  select type, count(*)
  from public.notifications
  where created_at >= p_start
    and created_at < p_end
    and type <> 'newsletter'
    and public.is_board()
  group by type;
$$;

grant execute on function public.get_notification_type_counts(timestamptz, timestamptz) to authenticated;
