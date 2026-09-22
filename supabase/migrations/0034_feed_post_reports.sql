-- Leden konden een ongepast bericht alleen melden buiten de app om. Voegt
-- een rapportage-functie toe: een vaste reden (dropdown) + optioneel een
-- vrij tekstveld, zichtbaar voor bestuur/beheer in /beheer/rapportages, die
-- het bericht daarna kunnen verwijderen of de melding kunnen afwijzen.
create table public.feed_post_reports (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.feed_posts (id) on delete cascade,
  reporter_id uuid not null references public.profiles (id) on delete cascade,
  reason text not null check (reason in ('ongepast', 'spam', 'misleidend', 'anders')),
  details text,
  status text not null default 'open' check (status in ('open', 'afgehandeld')),
  created_at timestamptz not null default now(),
  unique (post_id, reporter_id)
);

create index feed_post_reports_post_idx on public.feed_post_reports (post_id);
create index feed_post_reports_status_idx on public.feed_post_reports (status);

alter table public.feed_post_reports enable row level security;

-- Alleen bestuur/beheer ziet de rapportages zelf (niet de indiener van een
-- ander, en niet leden in het algemeen) — voorkomt dat rapporteren zelf een
-- nieuwe vorm van openbaar "aan de schandpaal nagelen" wordt.
create policy "feed_post_reports_board_select" on public.feed_post_reports
  for select using (public.is_board());

create policy "feed_post_reports_self_insert" on public.feed_post_reports
  for insert with check (reporter_id = auth.uid() and public.is_active_member());

create policy "feed_post_reports_board_update" on public.feed_post_reports
  for update using (public.is_board()) with check (public.is_board());

-- Notificeer bestuur/beheer bij een nieuwe rapportage.
create or replace function public.notify_feed_post_report()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_reporter_name text;
begin
  select first_name || ' ' || last_name into v_reporter_name
    from public.profiles where id = new.reporter_id;

  insert into public.notifications (profile_id, type, title, body, link)
  select id, 'feed_post_report', 'Bericht gerapporteerd',
    coalesce(v_reporter_name, 'Een lid') || ' heeft een bericht gerapporteerd (' || new.reason || ').',
    '/beheer/rapportages'
  from public.profiles
  where role in ('bestuurslid', 'beheerder');

  return new;
end;
$$;

create trigger feed_post_reports_notify
  after insert on public.feed_post_reports
  for each row execute function public.notify_feed_post_report();
