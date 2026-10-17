-- Performance-audit #14 (fase 3): zes tabellen stonden in de realtime-
-- publicatie, maar de app luistert (FeedList.tsx, useUnreadCount.ts) alleen
-- naar feed_posts, feed_comments en notifications. feed_likes,
-- feed_attachments en feed_comment_likes werden dus bij elke wijziging naar
-- elke open tab uitgezonden zonder dat iemand ernaar luistert — onnodig werk
-- voor zowel de database als elke open community-pagina. Puur een
-- publicatie-wijziging (wat er uitgezonden wordt), raakt geen tabeldata of
-- RLS.
alter publication supabase_realtime drop table public.feed_likes;
alter publication supabase_realtime drop table public.feed_attachments;
alter publication supabase_realtime drop table public.feed_comment_likes;
